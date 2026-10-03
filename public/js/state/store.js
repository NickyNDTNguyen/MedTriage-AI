// ============================================================================
// PRESENTATION LAYER (browser) - client-side state.
//
// `session` holds who is signed in. `guest` holds everything a guest does -
// deliberately in memory only, never in localStorage or a cookie, so closing
// the tab or pressing "Exit" really does destroy it.
// ============================================================================

export const session = {
  user: null,
  get role() { return this.user?.role ?? 'guest'; },
  get isGuest() { return !this.user; },
  get isPatient() { return this.user?.role === 'patient'; },
  get isClinician() { return ['doctor', 'admin'].includes(this.user?.role); },
  get displayName() {
    return this.user ? `${this.user.first_name} ${this.user.last_name}` : 'Guest';
  }
};

/** Everything a guest touches. Reset by `clearGuestSession()`. */
export const guest = {
  step: 0,
  consent: [false, false],
  answers: [],
  result: null,
  messages: [],
  aiSignals: null,
  freeText: null
};

export function clearGuestSession() {
  guest.step = 0;
  guest.consent = [false, false];
  guest.answers = [];
  guest.result = null;
  guest.messages = [];
  guest.aiSignals = null;
  guest.freeText = null;
}

/** Transient per-view scratch space (forms, chat drafts, loaded data). */
export const view = { data: null, error: null, busy: false, messages: [] };

export function setFlash(message, tone = 'ok') {
  view.flash = { message, tone };
}

export function takeFlash() {
  const flash = view.flash ?? null;
  view.flash = null;
  return flash;
}

export const QUESTIONNAIRE = { questions: [] };
