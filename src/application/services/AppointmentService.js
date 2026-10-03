// ============================================================================
// APPLICATION LOGIC LAYER - appointment booking.
//
// ACCESS RULE: booking requires a registered patient. A guest request never
// gets past `requirePatient()`, so no appointment can exist without a chart.
// ============================================================================
import { appointmentRepository } from '../../dataaccess/repositories/AppointmentRepository.js';
import { notificationService } from './NotificationService.js';
import { ValidationError, ForbiddenError, ConflictError, NotFoundError } from '../errors.js';

const CLINICIANS = [
  { name: 'Dr. Amara Rivera',  specialty: 'Internal Medicine' },
  { name: 'Dr. Noah Feld',     specialty: 'Cardiology' },
  { name: 'Dr. Priya Raman',   specialty: 'Neurology' },
  { name: 'Dr. Luis Ortega',   specialty: 'Pulmonology' },
  { name: 'Dr. Grace Osei',    specialty: 'Behavioral Health' }
];

export class AppointmentService {
  constructor({ appointments = appointmentRepository, notifications = notificationService } = {}) {
    this.appointments = appointments;
    this.notifications = notifications;
  }

  listClinicians() {
    return CLINICIANS;
  }

  /** The guard that implements "registered patients only". */
  static requirePatient(user) {
    if (!user) {
      throw ForbiddenError('Appointment booking needs a free account. Guests can still run a symptom check.');
    }
    if (user.role !== 'patient') {
      throw ForbiddenError('Only patient accounts can book their own appointments.');
    }
    return user;
  }

  async book(user, { clinician, specialty, scheduledAt, reason }) {
    AppointmentService.requirePatient(user);

    const problems = [];
    if (!clinician) problems.push('Choose a clinician.');
    if (!scheduledAt) problems.push('Choose a date and time.');

    const when = new Date(String(scheduledAt).replace(' ', 'T'));
    if (Number.isNaN(when.getTime())) problems.push('That date and time could not be read.');
    else if (when.getTime() < Date.now()) problems.push('Pick a time in the future.');
    if (problems.length) throw ValidationError('Please fix the highlighted fields.', problems);

    const slot = toSqlDateTime(when);
    if (this.appointments.findConflict(clinician, slot)) {
      throw ConflictError(`${clinician} is already booked at that time. Please pick another slot.`);
    }

    const resolvedSpecialty = specialty
      ?? CLINICIANS.find(c => c.name === clinician)?.specialty
      ?? 'Internal Medicine';

    const appointment = this.appointments.create({
      patientId: user.id,
      clinician,
      specialty: resolvedSpecialty,
      scheduledAt: slot,
      reason: String(reason ?? '').trim() || null
    });

    await this.notifications.sendAppointmentConfirmation(user, appointment);
    return appointment;
  }

  listFor(user) {
    AppointmentService.requirePatient(user);
    return this.appointments.listForPatient(user.id);
  }

  upcomingFor(user) {
    return this.appointments.listUpcomingForPatient(user.id);
  }

  cancel(user, appointmentId) {
    AppointmentService.requirePatient(user);
    const changed = this.appointments.updateStatus(appointmentId, user.id, 'cancelled');
    if (!changed) throw NotFoundError('That appointment was not found on your record.');
    return this.appointments.findById(appointmentId);
  }

  /** Re-send the reminder for an upcoming visit (stands in for a cron job). */
  async sendReminder(user, appointmentId) {
    AppointmentService.requirePatient(user);
    const appointment = this.appointments.findById(appointmentId);
    if (!appointment || appointment.patient_id !== user.id) {
      throw NotFoundError('That appointment was not found on your record.');
    }
    const sent = await this.notifications.sendAppointmentReminder(user, appointment);
    if (!sent.length) {
      throw ValidationError('No reminder channels are enabled.',
        ['Turn on email or text reminders in your profile, and make sure your phone number is saved.']);
    }
    return sent;
  }

  /**
   * Priority slot used by the escalation workflow: the next morning at 08:00.
   * Returns a SQL datetime string.
   */
  static nextPrioritySlot(from = new Date()) {
    const slot = new Date(from);
    slot.setDate(slot.getDate() + 1);
    slot.setHours(8, 0, 0, 0);
    return toSqlDateTime(slot);
  }
}

function toSqlDateTime(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
       + `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export const appointmentService = new AppointmentService();
export { CLINICIANS, toSqlDateTime };
