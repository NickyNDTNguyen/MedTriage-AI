// ============================================================================
// PRESENTATION LAYER (API) - the single place application errors become HTTP.
// Services throw AppError; this translates. Anything else is a 500 and the
// details stay on the server.
// ============================================================================
import { AppError } from '../../application/errors.js';

export function notFound(_req, res) {
  res.status(404).json({ error: { code: 'not_found', message: 'No such endpoint.' } });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details }
    });
  }

  console.error('[unhandled]', error);
  res.status(500).json({
    error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' }
  });
}

/** Wrap an async handler so a rejected promise reaches errorHandler. */
export const asyncRoute = handler => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
