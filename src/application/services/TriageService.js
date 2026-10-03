// ============================================================================
// APPLICATION LOGIC LAYER - the symptom check workflow.
//
// GUEST PRIVACY RULE, enforced here and only here:
//   a guest assessment is scored in memory and returned in the response.
//   `persist()` is reached only when a patient id is present. There is no
//   code path from a guest submission to the database.
// ============================================================================
import { triageAssessmentRepository, medicalRecordRepository }
  from '../../dataaccess/repositories/MedicalRecordRepository.js';
import { assess, validateAnswers, publicQuestionnaire } from '../domain/triageRules.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../errors.js';

export class TriageService {
  constructor({ assessments = triageAssessmentRepository, records = medicalRecordRepository } = {}) {
    this.assessments = assessments;
    this.records = records;
  }

  getQuestionnaire() {
    return publicQuestionnaire();
  }

  /**
   * Run a symptom check.
   * @param {object}      input
   * @param {number[]}    input.answers
   * @param {string|null} input.freeText    optional description from the chatbot
   * @param {object|null} input.aiSignals   structured hints from the chatbot
   * @param {object|null} user              null for a guest
   */
  submit({ answers, freeText = null, aiSignals = null }, user = null) {
    const problems = validateAnswers(answers);
    if (problems.length) throw ValidationError('That symptom check is incomplete.', problems);

    const result = assess(answers, aiSignals);

    // ---- guest branch: nothing is written, nothing is returned by id -------
    if (!user || user.role !== 'patient') {
      return {
        ...result,
        id: null,
        stored: false,
        privacyNote: 'This result was not saved. It disappears when you close or exit this session.'
      };
    }

    // ---- registered patient branch: persist to the chart ------------------
    const saved = this.assessments.save({
      patientId: user.id,
      answers,
      freeText,
      level: result.level,
      headline: result.headline,
      rationale: result.rationale
    });

    this.records.add({
      patientId: user.id,
      category: 'triage',
      title: `Symptom check - ${result.headline}`,
      detail: result.summary
    });

    return {
      ...result,
      id: saved.id,
      stored: true,
      privacyNote: 'Saved to your health records. You can delete it at any time.'
    };
  }

  historyFor(user) {
    return this.assessments.listForPatient(user.id);
  }

  /** Clinician queue. Patients may not read other people's cases. */
  openCasesFor(user) {
    if (!['doctor', 'admin'].includes(user.role)) {
      throw ForbiddenError('Only clinicians and administrators can view the case queue.');
    }
    return this.assessments.listOpenCases();
  }

  requireAssessment(id) {
    const assessment = this.assessments.findById(id);
    if (!assessment) throw NotFoundError('That symptom check no longer exists.');
    return assessment;
  }
}

export const triageService = new TriageService();
