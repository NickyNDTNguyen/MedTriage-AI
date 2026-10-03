// ============================================================================
// PRESENTATION LAYER (API) - turns a cookie into req.user, or leaves it null.
// This is the only place HTTP cookies are read or written.
// ============================================================================
import config from '../../config/index.js';
import services from '../../application/services/index.js';

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map(part => {
      const index = part.indexOf('=');
      if (index < 0) return null;
      return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
    }).filter(Boolean)
  );
}

/** Populates req.user (null for guests) on every request. */
export function attachUser(req, _res, next) {
  const cookies = parseCookies(req.headers.cookie ?? '');
  req.sessionToken = cookies[config.session.cookieName] ?? null;
  req.user = req.sessionToken ? services.auth.currentUser(req.sessionToken) : null;
  next();
}

export function setSessionCookie(res, { token, maxAgeMs }) {
  res.cookie(config.session.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/'
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.session.cookieName, { path: '/' });
}
