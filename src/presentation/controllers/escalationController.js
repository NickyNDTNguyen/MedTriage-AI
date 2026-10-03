// ============================================================================
// PRESENTATION LAYER (API) - case escalation endpoints. Clinicians only.
// ============================================================================
import services from '../../application/services/index.js';

export const escalationController = {
  async escalate(req, res) {
    const { assessmentId, specialty, priority, notes } = req.body ?? {};
    const outcome = await services.escalations.escalate(req.user, assessmentId, { specialty, priority, notes });
    res.status(201).json(outcome);
  },

  list(req, res) {
    res.json({ escalations: services.escalations.listAll(req.user) });
  },

  mine(req, res) {
    res.json({ escalations: services.escalations.listForPatient(req.user) });
  },

  updateStatus(req, res) {
    const escalation = services.escalations.updateStatus(
      req.user, Number(req.params.id), req.body?.status
    );
    res.json({ escalation });
  },

  specialists(req, res) {
    res.json({ specialists: services.escalations.listSpecialists() });
  }
};
