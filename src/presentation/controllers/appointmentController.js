// ============================================================================
// PRESENTATION LAYER (API) - appointment endpoints. Patients only.
// ============================================================================
import services from '../../application/services/index.js';

export const appointmentController = {
  clinicians(_req, res) {
    res.json({ clinicians: services.appointments.listClinicians() });
  },

  async book(req, res) {
    const appointment = await services.appointments.book(req.user, req.body ?? {});
    res.status(201).json({ appointment });
  },

  list(req, res) {
    res.json({ appointments: services.appointments.listFor(req.user) });
  },

  cancel(req, res) {
    res.json({ appointment: services.appointments.cancel(req.user, Number(req.params.id)) });
  },

  async remind(req, res) {
    const sent = await services.appointments.sendReminder(req.user, Number(req.params.id));
    res.json({ sent });
  }
};
