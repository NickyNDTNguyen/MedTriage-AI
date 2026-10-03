// ============================================================================
// APPLICATION LOGIC LAYER - case escalation.
//
// When a doctor or admin escalates a case, FOUR things happen automatically:
//   1. the case is flagged with a special treatment status
//   2. a specialist is assigned (least-loaded clinician in the right specialty)
//   3. the patient is notified (email and/or SMS, via NotificationService)
//   4. a priority appointment is created
//
// Steps 1, 2 and 4 are database writes and run inside ONE transaction - if any
// of them fails, none of them happened. Step 3 is an outbound side effect and
// deliberately runs AFTER the commit, so a provider outage cannot roll back a
// clinical decision that has already been recorded.
//
// ACCESS RULE: the case must belong to a registered patient. Guest symptom
// checks are never stored, so there is nothing for this service to escalate -
// the type system of the database enforces it (escalations.patient_id is NOT NULL).
// ============================================================================
import { randomBytes } from 'node:crypto';
import db from '../../database/connection.js';
import { escalationRepository, specialistRepository }
  from '../../dataaccess/repositories/EscalationRepository.js';
import { triageAssessmentRepository, medicalRecordRepository }
  from '../../dataaccess/repositories/MedicalRecordRepository.js';
import { appointmentRepository } from '../../dataaccess/repositories/AppointmentRepository.js';
import { userRepository } from '../../dataaccess/repositories/UserRepository.js';
import { notificationService } from './NotificationService.js';
import { AppointmentService } from './AppointmentService.js';
import { CATEGORY_TO_SPECIALTY } from '../domain/symptomLexicon.js';
import { ForbiddenError, NotFoundError, ConflictError } from '../errors.js';

export class EscalationService {
  constructor({
    escalations = escalationRepository,
    specialists = specialistRepository,
    assessments = triageAssessmentRepository,
    appointments = appointmentRepository,
    records = medicalRecordRepository,
    users = userRepository,
    notifications = notificationService
  } = {}) {
    Object.assign(this, { escalations, specialists, assessments, appointments, records, users, notifications });
  }

  /** Only clinical staff may escalate. */
  static requireClinician(user) {
    if (!user || !['doctor', 'admin'].includes(user.role)) {
      throw ForbiddenError('Only a doctor or administrator can escalate a case.');
    }
    return user;
  }

  /**
   * @param {object} actor        the signed-in doctor or admin
   * @param {number} assessmentId the stored triage assessment to escalate
   * @param {object} options      { specialty, priority, notes }
   */
  async escalate(actor, assessmentId, { specialty, priority = 'high', notes = null } = {}) {
    EscalationService.requireClinician(actor);

    const assessment = this.assessments.findById(Number(assessmentId));
    if (!assessment) throw NotFoundError('That symptom check no longer exists.');
    if (this.escalations.findByAssessment(assessment.id)) {
      throw ConflictError('That case has already been escalated.');
    }

    const patient = this.users.findById(assessment.patient_id);
    if (!patient) throw NotFoundError('The patient record for that case is missing.');

    const targetSpecialty = specialty
      ?? CATEGORY_TO_SPECIALTY[inferCategory(assessment)]
      ?? 'Internal Medicine';

    const effectivePriority = assessment.level === 'emergency' ? 'urgent' : priority;
    const caseRef = `MT-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    // ---------------- atomic block: effects 1, 2 and 4 ----------------------
    const { escalation, specialist, appointment } = db.transaction(() => {
      // Effect 2 - assign a specialist (least loaded in the specialty).
      const assigned = this.specialists.findLeastLoaded(targetSpecialty)
        ?? this.specialists.findAnyLeastLoaded();

      // Effect 4 - create the priority appointment.
      const slot = AppointmentService.nextPrioritySlot();
      const created = this.appointments.create({
        patientId: patient.id,
        clinician: assigned ? assigned.name : 'On-call specialist',
        specialty: assigned ? assigned.specialty : targetSpecialty,
        scheduledAt: slot,
        reason: `Escalated case ${caseRef} - ${assessment.headline}`,
        priority: 'priority'
      });

      // Effect 1 - flag the case with special treatment status.
      const row = this.escalations.create({
        caseRef,
        assessmentId: assessment.id,
        patientId: patient.id,
        raisedBy: actor.id,
        specialistId: assigned ? assigned.id : null,
        appointmentId: created.id,
        priority: effectivePriority,
        notes
      });
      this.assessments.markEscalated(assessment.id);

      if (assigned) this.specialists.incrementCaseload(assigned.id);

      // Keep the chart in step with the clinical decision.
      this.records.add({
        patientId: patient.id,
        category: 'note',
        title: `Case escalated for special treatment (${caseRef})`,
        detail: `Raised by ${actor.first_name} ${actor.last_name}. `
              + `Assigned to ${assigned ? `${assigned.name}, ${assigned.specialty}` : 'the on-call specialist'}. `
              + `Priority appointment set for ${slot}.`
              + (notes ? ` Notes: ${notes}` : '')
      });

      return { escalation: row, specialist: assigned, appointment: created };
    });

    // -------- effect 3: notify the patient, after the commit ---------------
    let notified = [];
    let notifyError = null;
    try {
      notified = await this.notifications.sendEscalationNotice(patient, { escalation, specialist, appointment });
    } catch (error) {
      notifyError = error.message;
    }

    return {
      escalation: this.escalations.findById(escalation.id),
      specialist,
      appointment,
      patient: { id: patient.id, name: `${patient.first_name} ${patient.last_name}`, email: patient.email },
      effects: {
        flagged: { status: escalation.status, priority: escalation.priority, caseRef },
        assigned: specialist ? { name: specialist.name, specialty: specialist.specialty } : null,
        notified: notified.map(n => ({ channel: n.channel, recipient: n.recipient, status: n.status })),
        appointmentCreated: { id: appointment.id, scheduledAt: appointment.scheduled_at, priority: appointment.priority }
      },
      notifyError
    };
  }

  listAll(actor) {
    EscalationService.requireClinician(actor);
    return this.escalations.listAll();
  }

  listForPatient(user) {
    return this.escalations.listForPatient(user.id);
  }

  updateStatus(actor, escalationId, status) {
    EscalationService.requireClinician(actor);
    if (!['special_treatment', 'in_review', 'resolved'].includes(status)) {
      throw ForbiddenError('Unknown case status.');
    }
    if (!this.escalations.updateStatus(escalationId, status)) {
      throw NotFoundError('That case was not found.');
    }
    return this.escalations.findById(escalationId);
  }

  listSpecialists() {
    return this.specialists.listAll();
  }
}

/** Recover the clinical category from a stored assessment's answers. */
function inferCategory(assessment) {
  const [, mainSymptom, , redFlags] = assessment.answers;
  if (redFlags === 1) return 'cardiac';
  if (redFlags === 2) return 'neuro';
  return ['neuro', 'cardiac', 'infection', 'general'][mainSymptom] ?? 'general';
}

export const escalationService = new EscalationService();
