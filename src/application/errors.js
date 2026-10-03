// ============================================================================
// APPLICATION LOGIC LAYER - the error vocabulary services speak.
// The presentation layer maps these to HTTP status codes; no service ever
// mentions a status code itself.
// ============================================================================
export class AppError extends Error {
  constructor(message, { status = 400, code = 'bad_request', details = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const ValidationError = (message, details) =>
  new AppError(message, { status: 422, code: 'validation_failed', details });

export const AuthError = (message = 'Email or password is incorrect.') =>
  new AppError(message, { status: 401, code: 'unauthenticated' });

export const ForbiddenError = (message = 'Your account type cannot do that.') =>
  new AppError(message, { status: 403, code: 'forbidden' });

export const NotFoundError = (message = 'Not found.') =>
  new AppError(message, { status: 404, code: 'not_found' });

export const ConflictError = (message) =>
  new AppError(message, { status: 409, code: 'conflict' });
