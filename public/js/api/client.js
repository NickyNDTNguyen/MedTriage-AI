// ============================================================================
// PRESENTATION LAYER (browser) - the ONLY module that knows fetch() exists.
//
// Views call api.triage.submit(...); they never see a URL, a verb or a status
// code. Swapping transport (REST -> GraphQL -> WebSocket) changes this file
// alone. Mirrors the role of the server's data access layer, one tier up.
// ============================================================================

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details ?? [];
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.',
      { status: 0, code: 'offline' });
  }

  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = payload.error ?? {};
    throw new ApiError(error.message ?? 'Something went wrong.', {
      status: response.status, code: error.code, details: error.details
    });
  }
  return payload;
}

const get = path => request('GET', path);
const post = (path, body) => request('POST', path, body);
const put = (path, body) => request('PUT', path, body);
const del = path => request('DELETE', path);

export const api = {
  auth: {
    me:       ()     => get('/auth/me'),
    register: data   => post('/auth/register', data),
    signIn:   data   => post('/auth/signin', data),
    signOut:  ()     => post('/auth/signout')
  },
  triage: {
    questionnaire: () => get('/triage/questionnaire'),
    submit: (answers, { freeText, aiSignals } = {}) =>
      post('/triage/submit', { answers, freeText, aiSignals }),
    history: () => get('/triage/history')
  },
  chat: {
    send:    (text, history = []) => post('/chat/send', { text, history }),
    history: () => get('/chat/history'),
    clear:   () => del('/chat/history')
  },
  appointments: {
    clinicians: () => get('/appointments/clinicians'),
    list:       () => get('/appointments'),
    book:       data => post('/appointments', data),
    cancel:     id => del(`/appointments/${id}`),
    remind:     id => post(`/appointments/${id}/remind`)
  },
  patient: {
    dashboard:       () => get('/patient/dashboard'),
    profile:         () => get('/patient/profile'),
    updateProfile:   data => put('/patient/profile', data),
    updateReminders: data => put('/patient/reminders', data),
    records:         () => get('/patient/records'),
    addRecord:       data => post('/patient/records', data),
    deleteRecord:    id => del(`/patient/records/${id}`),
    notifications:   () => get('/patient/notifications'),
    escalations:     () => get('/patient/escalations')
  },
  clinical: {
    cases:        () => get('/cases'),
    escalations:  () => get('/escalations'),
    escalate:     data => post('/escalations', data),
    updateStatus: (id, status) => put(`/escalations/${id}`, { status }),
    specialists:  () => get('/specialists')
  }
};

export default api;
