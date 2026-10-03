// ============================================================================
// DATA ACCESS LAYER - appointments.
// ============================================================================
import db from '../../database/connection.js';

export class AppointmentRepository {
  create({ patientId, clinician, specialty, scheduledAt, reason = null, priority = 'standard' }) {
    const { lastInsertRowid } = db.run(
      `INSERT INTO appointments
         (patient_id, clinician, specialty, scheduled_at, reason, priority)
       VALUES (?,?,?,?,?,?)`,
      patientId, clinician, specialty, scheduledAt, reason, priority
    );
    return this.findById(lastInsertRowid);
  }

  findById(id) {
    return db.get('SELECT * FROM appointments WHERE id = ?', id);
  }

  listForPatient(patientId) {
    return db.all(
      'SELECT * FROM appointments WHERE patient_id = ? ORDER BY scheduled_at',
      patientId
    );
  }

  listUpcomingForPatient(patientId) {
    return db.all(
      `SELECT * FROM appointments
        WHERE patient_id = ? AND status = 'scheduled' AND scheduled_at >= datetime('now')
        ORDER BY scheduled_at`,
      patientId
    );
  }

  /** Used to reject double-booking a clinician in the same slot. */
  findConflict(clinician, scheduledAt) {
    return db.get(
      `SELECT * FROM appointments
        WHERE clinician = ? AND scheduled_at = ? AND status = 'scheduled'`,
      clinician, scheduledAt
    );
  }

  updateStatus(id, patientId, status) {
    return db.run(
      'UPDATE appointments SET status = ? WHERE id = ? AND patient_id = ?',
      status, id, patientId
    ).changes;
  }
}

export const appointmentRepository = new AppointmentRepository();
