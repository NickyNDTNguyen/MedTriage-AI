// ============================================================================
// PRESENTATION LAYER (API) - route guards.
//
// These stop an unauthorised request at the HTTP boundary so it never costs a
// service call. The services repeat the same checks, because defence belongs
// in the layer that owns the rule - the guard is a fast path, not the rule.
// ============================================================================
import { AppError } from '../../application/errors.js';

export function requireAuth(req, _res, next) {
  if (!req.user) {
    return next(new AppError('Sign in to continue.', { status: 401, code: 'unauthenticated' }));
  }
  next();
}

/** "Registered patients only" - used by appointments and the chart. */
export function requirePatient(req, _res, next) {
  if (!req.user) {
    return next(new AppError(
      'This feature needs a free account. Guests can still run a symptom check.',
      { status: 401, code: 'unauthenticated' }
    ));
  }
  if (req.user.role !== 'patient') {
    return next(new AppError('Only patient accounts can use this.', { status: 403, code: 'forbidden' }));
  }
  next();
}

/** Doctors and admins - used by the case queue and escalation. */
export function requireClinician(req, _res, next) {
  if (!req.user) {
    return next(new AppError('Sign in as a clinician to continue.', { status: 401, code: 'unauthenticated' }));
  }
  if (!['doctor', 'admin'].includes(req.user.role)) {
    return next(new AppError(
      'Only a doctor or administrator can do that.', { status: 403, code: 'forbidden' }
    ));
  }
  next();
}
