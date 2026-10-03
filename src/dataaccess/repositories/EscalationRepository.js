// ============================================================================
// DATA ACCESS LAYER - escalated cases and the specialist assignment pool.
// ============================================================================
import db from '../../database/connection.js';

export class EscalationRepository {
  create({ caseRef, assessmentId, patientId, raisedBy, specialistId,
           appointmentId, priority = 'high', notes = null }) {
    const { lastInsertRowid } = db.run(
      `INSERT INTO escalations
         (case_ref, assessment_id, patient_id, raised_by, specialist_id,
          appointment_id, priority, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      caseRef, assessmentId, patientId, raisedBy, specialistId,
      appointmentId, priority, notes
    );
    return this.findById(lastInsertRowid);
  }

  findById(id) {
    return db.get(
      `SELECT e.*, s.name AS specialist_name, s.specialty AS specialist_specialty
         FROM escalations e
         LEFT JOIN specialists s ON s.id = e.specialist_id
        WHERE e.id = ?`,
      id
    );
  }

  findByAssessment(assessmentId) {
    return db.get('SELECT * FROM escalations WHERE assessment_id = ?', assessmentId);
  }

  listAll() {
    return db.all(
      `SELECT e.*, s.name AS specialist_name, s.specialty AS specialist_specialty,
              u.first_name, u.last_name, u.email,
              t.level, t.headline
         FROM escalations e
         LEFT JOIN specialists s ON s.id = e.specialist_id
         JOIN users u ON u.id = e.patient_id
         JOIN triage_assessments t ON t.id = e.assessment_id
        ORDER BY e.id DESC`
    );
  }

  listForPatient(patientId) {
    return db.all(
      `SELECT e.*, s.name AS specialist_name, s.specialty AS specialist_specialty,
              t.level, t.headline
         FROM escalations e
         LEFT JOIN specialists s ON s.id = e.specialist_id
         JOIN triage_assessments t ON t.id = e.assessment_id
        WHERE e.patient_id = ?
        ORDER BY e.id DESC`,
      patientId
    );
  }

  updateStatus(id, status) {
    return db.run('UPDATE escalations SET status = ? WHERE id = ?', status, id).changes;
  }
}

export class SpecialistRepository {
  /** Least-loaded active specialist in a specialty - the assignment rule. */
  findLeastLoaded(specialty) {
    return db.get(
      `SELECT * FROM specialists
        WHERE specialty = ? AND active = 1
        ORDER BY active_cases ASC, id ASC LIMIT 1`,
      specialty
    );
  }

  findAnyLeastLoaded() {
    return db.get(
      'SELECT * FROM specialists WHERE active = 1 ORDER BY active_cases ASC, id ASC LIMIT 1'
    );
  }

  listAll() {
    return db.all('SELECT * FROM specialists ORDER BY specialty, name');
  }

  incrementCaseload(id) {
    db.run('UPDATE specialists SET active_cases = active_cases + 1 WHERE id = ?', id);
  }
}

export const escalationRepository = new EscalationRepository();
export const specialistRepository = new SpecialistRepository();
