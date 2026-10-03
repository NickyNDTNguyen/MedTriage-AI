// ============================================================================
// PRESENTATION LAYER (API) - symptom check endpoints.
// Open to guests by design; TriageService decides what is stored.
// ============================================================================
import services from '../../application/services/index.js';

export const triageController = {
  questionnaire(_req, res) {
    res.json({ questions: services.triage.getQuestionnaire() });
  },

  submit(req, res) {
    const { answers, freeText, aiSignals } = req.body ?? {};
    const result = services.triage.submit({ answers, freeText, aiSignals }, req.user);
    res.status(201).json({ result });
  },

  history(req, res) {
    res.json({ assessments: services.triage.historyFor(req.user) });
  },

  openCases(req, res) {
    res.json({ cases: services.triage.openCasesFor(req.user) });
  }
};
