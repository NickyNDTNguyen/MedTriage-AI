// ============================================================================
// PRESENTATION LAYER (API) - controllers hold NO business logic.
// Read the request, call one service, shape the response. That is all.
// ============================================================================
import services from '../../application/services/index.js';
import { setSessionCookie, clearSessionCookie } from '../middleware/session.js';

export const authController = {
  async register(req, res) {
    const { user, session } = await services.auth.register(req.body ?? {});
    setSessionCookie(res, session);
    res.status(201).json({ user });
  },

  async signIn(req, res) {
    const { user, session } = await services.auth.signIn(req.body ?? {});
    setSessionCookie(res, session);
    res.json({ user });
  },

  signOut(req, res) {
    services.auth.signOut(req.sessionToken);
    clearSessionCookie(res);
    res.json({ signedOut: true });
  },

  /** The UI calls this on boot to decide guest vs patient vs clinician. */
  me(req, res) {
    res.json({ user: req.user, role: req.user?.role ?? 'guest' });
  }
};
