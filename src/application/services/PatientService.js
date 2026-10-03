// ============================================================================
// APPLICATION LOGIC LAYER - the patient's own profile, chart and dashboard.
// ============================================================================
import { userRepository } from '../../dataaccess/repositories/UserRepository.js';
import {
  medicalRecordRepository, triageAssessmentRepository
} from '../../dataaccess/repositories/MedicalRecordRepository.js';
import { appointmentRepository } from '../../dataaccess/repositories/AppointmentRepository.js';
import { escalationRepository } from '../../dataaccess/repositories/EscalationRepository.js';
import { notificationRepository } from '../../dataaccess/repositories/NotificationRepository.js';
import { ValidationError, NotFoundError } from '../errors.js';

export class PatientService {
  constructor({
    users = userRepository,
    records = medicalRecordRepository,
    assessments = triageAssessmentRepository,
    appointments = appointmentRepository,
    escalations = escalationRepository,
    notifications = notificationRepository
  } = {}) {
    Object.assign(this, { users, records, assessments, appointments, escalations, notifications });
  }

  /** Everything the dashboard needs, in one round trip. */
  dashboard(user) {
    const upcoming = this.appointments.listUpcomingForPatient(user.id);
    const assessments = this.assessments.listForPatient(user.id);
    const escalations = this.escalations.listForPatient(user.id);

    return {
      user,
      nextAppointment: upcoming[0] ?? null,
      appointmentCount: upcoming.length,
      recentRecords: this.records.listForPatient(user.id).slice(0, 5),
      lastAssessment: assessments[0] ?? null,
      assessmentCount: assessments.length,
      escalations,
      hasEscalation: escalations.some(e => e.status !== 'resolved'),
      notifications: this.notifications.listForUser(user.id, 10)
    };
  }

  profile(user) {
    return {
      user: this.users.findById(user.id),
      notifications: this.notifications.listForUser(user.id, 25)
    };
  }

  updateProfile(user, input) {
    const firstName = String(input.firstName ?? '').trim();
    const lastName = String(input.lastName ?? '').trim();
    const problems = [];
    if (!firstName) problems.push('First name is required.');
    if (!lastName) problems.push('Last name is required.');

    const phone = String(input.phone ?? '').trim() || null;
    if (phone && !/^[+\d][\d\s().-]{6,}$/.test(phone)) problems.push('Enter a usable phone number.');
    if (problems.length) throw ValidationError('Please fix the highlighted fields.', problems);

    return this.users.updateProfile(user.id, {
      firstName, lastName, phone,
      dateOfBirth: input.dateOfBirth || null,
      coverageType: input.coverageType || null
    });
  }

  updateReminderPreferences(user, input) {
    const wantsSms = Boolean(input.reminderSms);
    const current = this.users.findById(user.id);
    if (wantsSms && !current.phone) {
      throw ValidationError('Add a mobile number first.',
        ['Text reminders need a phone number on your profile.']);
    }
    return this.users.updateReminderPreferences(user.id, {
      reminderEmail: input.reminderEmail !== false,
      reminderSms: wantsSms
    });
  }

  records(user) {
    return {
      records: this.records.listForPatient(user.id),
      assessments: this.assessments.listForPatient(user.id)
    };
  }

  addRecord(user, input) {
    const title = String(input.title ?? '').trim();
    const category = input.category;
    const problems = [];
    if (!title) problems.push('Give the entry a title.');
    if (!['visit', 'lab', 'medication', 'note'].includes(category)) {
      problems.push('Choose a record type.');
    }
    if (problems.length) throw ValidationError('Please fix the highlighted fields.', problems);

    return this.records.add({
      patientId: user.id,
      category,
      title,
      detail: String(input.detail ?? '').trim() || null,
      recordedAt: input.recordedAt || null
    });
  }

  deleteRecord(user, recordId) {
    if (!this.records.remove(recordId, user.id)) {
      throw NotFoundError('That record was not found on your chart.');
    }
    return { deleted: true };
  }
}

export const patientService = new PatientService();
