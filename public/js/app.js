// ============================================================================
// PRESENTATION LAYER (browser) - router, event delegation, view lifecycle.
//
// This file owns NAVIGATION and USER EVENTS. It holds no business rules:
// every decision that matters (is this urgent? may this person book? what gets
// stored?) is made by the server's application logic layer. The worst a tamper
// with this file can do is show the wrong screen.
// ============================================================================
import { api, ApiError } from './api/client.js';
import {
  session, guest, view, clearGuestSession, setFlash, QUESTIONNAIRE
} from './state/store.js';

import { landing } from './views/landing.js';
import { signin, register } from './views/auth.js';
import { check } from './views/check.js';
import { dashboard } from './views/dashboard.js';
import { appointments } from './views/appointments.js';
import { records } from './views/records.js';
import { profile } from './views/profile.js';
import { assistant } from './views/assistant.js';
import { clinical, escalations } from './views/clinical.js';

// ---------------------------------------------------------------------------
// Route table. `access` is a UI convenience - the API enforces the same rules.
// ---------------------------------------------------------------------------
const ROUTES = {
  '':             { view: landing,      access: 'public' },
  'signin':       { view: signin,       access: 'anonymous' },
  'register':     { view: register,     access: 'anonymous' },
  'check':        { view: check,        access: 'public' },
  'assistant':    { view: assistant,    access: 'public' },
  'dashboard':    { view: dashboard,    access: 'patient' },
  'appointments': { view: appointments, access: 'patient' },
  'records':      { view: records,      access: 'patient' },
  'profile':      { view: profile,      access: 'patient' },
  'clinical':     { view: clinical,     access: 'clinician' },
  'escalations':  { view: escalations,  access: 'clinician' }
};

const root = document.getElementById('app');

function homeFor() {
  if (session.isClinician) return 'clinical';
  if (session.isPatient) return 'dashboard';
  return '';
}

function permitted(access) {
  switch (access) {
    case 'public':    return true;
    case 'anonymous': return session.isGuest;
    case 'patient':   return session.isPatient;
    case 'clinician': return session.isClinician;
    default:          return false;
  }
}

// ---------------------------------------------------------------------------
// Render cycle: resolve route -> guard -> load data -> paint.
// ---------------------------------------------------------------------------
let renderToken = 0;

async function render() {
  const token = ++renderToken;
  const key = (location.hash.replace(/^#\/?/, '').split('#')[0]) || '';
  const route = ROUTES[key];

  if (!route) return navigate(homeFor());
  if (!permitted(route.access)) {
    if (route.access === 'anonymous') return navigate(homeFor());
    setFlash('Sign in to open that page.', 'warn');
    return navigate(session.isGuest ? 'signin' : homeFor());
  }

  if (route.view.load) {
    view.data = null;
    paint(route.view.render());
    try {
      await route.view.load();
    } catch (error) {
      if (token !== renderToken) return;
      if (error instanceof ApiError && error.status === 401) {
        session.user = null;
        return navigate('signin');
      }
      view.error = error;
    }
  }

  if (token !== renderToken) return;
  paint(route.view.render());
  view.error = null;
}

function paint(html) {
  root.innerHTML = html;
  const chat = document.getElementById('chat');
  if (chat) chat.scrollTop = chat.scrollHeight;
  const focusTarget = root.querySelector('h1');
  if (focusTarget) focusTarget.setAttribute('tabindex', '-1');
  window.scrollTo(0, 0);
}

function navigate(key) {
  const target = `#/${key}`;
  if (location.hash === target) render();
  else location.hash = target;
}

/** Re-run the current route's loader and repaint. */
const refresh = () => render();

function fail(error) {
  view.error = error instanceof ApiError
    ? error
    : { message: error?.message ?? 'Something went wrong.', details: [] };
  render();
}

// ---------------------------------------------------------------------------
// Click handling - one delegated listener for the whole application.
// ---------------------------------------------------------------------------
const clickActions = {
  async signout() {
    await api.auth.signOut().catch(() => {});
    session.user = null;
    clearGuestSession();
    setFlash('You are signed out.', 'ok');
    navigate('');
  },

  'begin-check'() { guest.step = 1; render(); },
  'back-check'()  { guest.step = Math.max(0, guest.step - 1); render(); },

  async 'next-check'() {
    const total = QUESTIONNAIRE.questions.length;
    if (guest.step < total) { guest.step += 1; return render(); }

    view.busy = true; render();
    try {
      const { result } = await api.triage.submit(guest.answers, {
        freeText: guest.freeText, aiSignals: guest.aiSignals
      });
      guest.result = result;
      guest.step = total + 1;
      view.busy = false;
      render();
    } catch (error) { view.busy = false; fail(error); }
  },

  'restart-check'() {
    clearGuestSession();
    guest.step = 0;
    navigate('check');
  },

  'exit-check'() {
    clearGuestSession();
    navigate(homeFor());
  },

  'carry-to-check'() { navigate('check'); },

  async 'clear-chat'() {
    await api.chat.clear().catch(() => {});
    view.messages = [];
    view.usedContext = null;
    render();
  },

  async 'cancel-appt'(target) {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await api.appointments.cancel(Number(target.dataset.id));
      setFlash('Appointment cancelled.', 'ok');
      refresh();
    } catch (error) { fail(error); }
  },

  async 'remind-appt'(target) {
    try {
      const { sent } = await api.appointments.remind(Number(target.dataset.id));
      setFlash(`Reminder sent via ${sent.map(s => s.channel).join(' and ')}. See your profile outbox.`, 'ok');
      refresh();
    } catch (error) { fail(error); }
  },

  async 'delete-record'(target) {
    if (!confirm('Delete this entry from your chart? This cannot be undone.')) return;
    try {
      await api.patient.deleteRecord(Number(target.dataset.id));
      setFlash('Entry deleted.', 'ok');
      refresh();
    } catch (error) { fail(error); }
  },

  async 'case-status'(target) {
    try {
      await api.clinical.updateStatus(Number(target.dataset.id), target.dataset.status);
      setFlash('Case status updated.', 'ok');
      refresh();
    } catch (error) { fail(error); }
  }
};

document.addEventListener('click', event => {
  const consent = event.target.closest('[data-consent]');
  if (consent) {
    guest.consent[Number(consent.dataset.consent)] = consent.checked;
    const begin = document.querySelector('[data-action="begin-check"]');
    if (begin) begin.disabled = !(guest.consent[0] && guest.consent[1]);
    return;
  }

  const pick = event.target.closest('[data-pick]');
  if (pick) {
    guest.answers[guest.step - 1] = Number(pick.dataset.pick);
    return render();
  }

  const chip = event.target.closest('[data-chip]');
  if (chip) return sendChat(chip.dataset.chip);

  const action = event.target.closest('[data-action]');
  if (action && clickActions[action.dataset.action]) {
    event.preventDefault();
    clickActions[action.dataset.action](action);
  }
});

// ---------------------------------------------------------------------------
// Form handling - one delegated submit listener.
// ---------------------------------------------------------------------------
const formHandlers = {
  async signin(data) {
    const { user } = await api.auth.signIn(data);
    session.user = user;
    clearGuestSession();
    setFlash(`Signed in as ${user.first_name}.`, 'ok');
    navigate(homeFor());
  },

  async register(data) {
    const { user } = await api.auth.register({
      ...data,
      acceptedTerms: data.acceptedTerms === 'on' || data.acceptedTerms === true,
      reminderEmail: data.reminderEmail === 'on' || data.reminderEmail === true,
      reminderSms: data.reminderSms === 'on' || data.reminderSms === true
    });
    session.user = user;
    setFlash(`Welcome, ${user.first_name}. Your account is ready.`, 'ok');
    navigate(homeFor());
  },

  async 'book-appointment'(data, form) {
    const option = form.querySelector('[name="clinician"] option:checked');
    await api.appointments.book({ ...data, specialty: option?.dataset.specialty });
    setFlash('Appointment booked. A confirmation is in your outbox.', 'ok');
    refresh();
  },

  async 'add-record'(data) {
    await api.patient.addRecord(data);
    setFlash('Entry added to your chart.', 'ok');
    refresh();
  },

  async 'update-profile'(data) {
    const { user } = await api.patient.updateProfile(data);
    session.user = user;
    setFlash('Profile updated.', 'ok');
    refresh();
  },

  async 'update-reminders'(data) {
    const { user } = await api.patient.updateReminders({
      reminderEmail: data.reminderEmail === 'on',
      reminderSms: data.reminderSms === 'on'
    });
    session.user = user;
    setFlash('Reminder preferences saved.', 'ok');
    refresh();
  },

  async escalate(data, form) {
    const outcome = await api.clinical.escalate({
      assessmentId: Number(form.dataset.id),
      specialty: data.specialty || undefined,
      priority: data.priority,
      notes: data.notes || undefined
    });
    const e = outcome.effects;
    setFlash(
      `Case ${e.flagged.caseRef} escalated. `
      + `Assigned to ${e.assigned?.name ?? 'the on-call specialist'}. `
      + `Patient notified by ${e.notified.map(n => n.channel).join(' and ') || 'no channel'}. `
      + `Priority appointment booked.`, 'ok');
    refresh();
  },

  async chat(data, form) {
    form.reset();
    await sendChat(data.text);
  }
};

document.addEventListener('submit', async event => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();

  const handler = formHandlers[form.dataset.form];
  if (!handler) return;

  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;

  const data = Object.fromEntries(new FormData(form).entries());
  for (const box of form.querySelectorAll('input[type="checkbox"]')) {
    data[box.name] = box.checked;
  }

  try {
    await handler(data, form);
  } catch (error) {
    fail(error);
  } finally {
    if (submit) submit.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Assistant turn. Guests carry their own transcript so nothing is stored.
// ---------------------------------------------------------------------------
async function sendChat(text) {
  const message = String(text ?? '').trim();
  if (!message || view.busy) return;

  view.messages = view.messages ?? [];
  view.messages.push({ author: 'user', text: message });
  if (session.isGuest) guest.messages = view.messages;

  view.busy = true;
  render();

  try {
    const history = session.isGuest
      ? view.messages.map(m => ({ author: m.author, text: m.text }))
      : [];
    const response = await api.chat.send(message, history);

    view.messages.push({ author: 'assistant', text: response.reply });
    view.usedContext = response.usedContext;

    // Carry structured signals into the symptom check, for guests and patients.
    if (response.signals?.symptoms?.length || response.signals?.redFlag) {
      guest.aiSignals = response.signals;
      guest.freeText = message;
    }
    if (session.isGuest) guest.messages = view.messages;
  } catch (error) {
    view.error = error;
    view.messages.pop();
  } finally {
    view.busy = false;
    render();
  }
}

// ---------------------------------------------------------------------------
// Boot: resolve who we are, load the questionnaire, then route.
// ---------------------------------------------------------------------------
async function boot() {
  try {
    const [{ user }, { questions }] = await Promise.all([
      api.auth.me(),
      api.triage.questionnaire()
    ]);
    session.user = user;
    QUESTIONNAIRE.questions = questions;
  } catch {
    QUESTIONNAIRE.questions = [];
  }

  window.addEventListener('hashchange', render);
  render();
}

// Show/hide the specialty field on the registration form.
document.addEventListener('change', event => {
  if (event.target.matches('[data-role-select]')) {
    const extra = document.querySelector('[data-role-extra]');
    if (extra) extra.hidden = event.target.value !== 'doctor';
  }
  if (event.target.matches('[data-consent]')) {
    guest.consent[Number(event.target.dataset.consent)] = event.target.checked;
    const begin = document.querySelector('[data-action="begin-check"]');
    if (begin) begin.disabled = !(guest.consent[0] && guest.consent[1]);
  }
});

boot();
