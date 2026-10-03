// ============================================================================
// PRESENTATION LAYER (API) - dashboard, profile, chart and the outbox view.
// ============================================================================
import services from '../../application/services/index.js';

export const patientController = {
  dashboard(req, res) {
    res.json(services.patients.dashboard(req.user));
  },

  profile(req, res) {
    res.json(services.patients.profile(req.user));
  },

  updateProfile(req, res) {
    res.json({ user: services.patients.updateProfile(req.user, req.body ?? {}) });
  },

  updateReminders(req, res) {
    res.json({ user: services.patients.updateReminderPreferences(req.user, req.body ?? {}) });
  },

  records(req, res) {
    res.json(services.patients.records(req.user));
  },

  addRecord(req, res) {
    res.status(201).json({ record: services.patients.addRecord(req.user, req.body ?? {}) });
  },

  deleteRecord(req, res) {
    res.json(services.patients.deleteRecord(req.user, Number(req.params.id)));
  },

  notifications(req, res) {
    res.json({ notifications: services.notifications.listForUser(req.user.id) });
  }
};
