// ============================================================================
// DATA ACCESS LAYER - medical records and stored triage assessments.
// ============================================================================
import db from '../../database/connection.js';

export class MedicalRecordRepository {
  add({ patientId, category, title, detail = null, recordedAt = null }) {
    const { lastInsertRowid } = db.run(
      `INSERT INTO medical_records (patient_id, category, title, detail, recorded_at)
       VALUES (?,?,?,?, COALESCE(?, datetime('now')))`,
      patientId, category, title, detail, recordedAt
    );
    return db.get('SELECT * FROM medical_records WHERE id = ?', lastInsertRowid);
  }

  listForPatient(patientId) {
    return db.all(
      'SELECT * FROM medical_records WHERE patient_id = ? ORDER BY recorded_at DESC, id DESC',
      patientId
    );
  }

  listForPatientByCategory(patientId, category) {
    return db.all(
      `SELECT * FROM medical_records
        WHERE patient_id = ? AND category = ?
        ORDER BY recorded_at DESC`,
      patientId, category
    );
  }

  remove(id, patientId) {
    return db.run('DELETE FROM medical_records WHERE id = ? AND patient_id = ?', id, patientId).changes;
  }
}

export class TriageAssessmentRepository {
  /**
   * Persist a completed assessment. Called only for signed-in patients -
   * TriageService never routes a guest result here.
   */
  save({ patientId, answers, freeText, level, headline, rationale }) {
    const { lastInsertRowid } = db.run(
      `INSERT INTO triage_assessments
         (patient_id, answers, free_text, level, headline, rationale)
       VALUES (?,?,?,?,?,?)`,
      patientId, JSON.stringify(answers), freeText ?? null,
      level, headline, JSON.stringify(rationale)
    );
    return this.findById(lastInsertRowid);
  }

  findById(id) {
    return hydrate(db.get('SELECT * FROM triage_assessments WHERE id = ?', id));
  }

  listForPatient(patientId) {
    return db.all(
      'SELECT * FROM triage_assessments WHERE patient_id = ? ORDER BY id DESC',
      patientId
    ).map(hydrate);
  }

  /** Clinician work queue: assessments not yet escalated, worst first. */
  listOpenCases() {
    return db.all(
      `SELECT t.*, u.first_name, u.last_name, u.email, u.phone
         FROM triage_assessments t
         JOIN users u ON u.id = t.patient_id
        WHERE t.escalated = 0
        ORDER BY CASE t.level WHEN 'emergency' THEN 0 WHEN 'same_day' THEN 1 ELSE 2 END,
                 t.id DESC`
    ).map(hydrate);
  }

  markEscalated(id) {
    db.run('UPDATE triage_assessments SET escalated = 1 WHERE id = ?', id);
  }
}

function hydrate(row) {
  if (!row) return null;
  return {
    ...row,
    answers: JSON.parse(row.answers),
    rationale: JSON.parse(row.rationale),
    escalated: Boolean(row.escalated)
  };
}

export const medicalRecordRepository = new MedicalRecordRepository();
export const triageAssessmentRepository = new TriageAssessmentRepository();
