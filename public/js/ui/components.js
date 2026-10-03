// ============================================================================
// PRESENTATION LAYER (browser) - shared markup helpers.
// Pure string builders: no state, no fetching, no business rules.
// ============================================================================
import { session } from '../state/store.js';

export const NAME = 'MedTriage AI';

export const EMERGENCY_TEXT =
  'Severe chest pain · major trouble breathing · signs of stroke · fainting with injury · '
  + 'heavy bleeding · severe allergic reaction · thoughts of harming yourself or others';

export const DISCLAIMER =
  `${NAME} is a fictional academic project. It is not a medical device and is not connected to any `
  + 'government or insurance system. Guidance is informational only and is never a diagnosis.';

/** Escape anything that came from a user or the database before it meets innerHTML. */
export const esc = value => String(value ?? '').replace(/[&<>"']/g,
  ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export const brand = () => `<a href="#/" class="brand"><span class="mark">♥</span>${NAME}</a>`;

export const footer = () => `<footer class="foot">${brand()}<p>${DISCLAIMER}</p>
  <span>Privacy · Accessibility · Terms</span></footer>`;

export function publicHeader() {
  const actions = session.user
    ? `<a class="btn o" href="#/${session.isClinician ? 'clinical' : 'dashboard'}">Go to my ${session.isClinician ? 'queue' : 'dashboard'}</a>`
    : `<a class="btn o" href="#/signin">Sign in</a><a class="btn" href="#/register">Create account</a>`;
  return `<header class="hd">${brand()}
    <nav class="nav"><a href="#/#how">How it works</a><a href="#/check">Guest checker</a><a href="#/#safe">Safety</a></nav>
    <div class="acts">${actions}</div></header>`;
}

/** The signed-in shell: sidebar navigation keyed by role. */
export function appShell(active, body) {
  const links = session.isClinician
    ? [['clinical', '🩺 Case queue'], ['escalations', '🚨 Escalated cases'], ['assistant', '✨ Assistant']]
    : [['dashboard', '🏠 Dashboard'], ['appointments', '📅 Appointments'], ['records', '📄 Records'],
       ['assistant', '✨ AI Assistant'], ['profile', '⚙️ Profile']];

  const roleBadge = session.isClinician
    ? `<span class="badge">${esc(session.user.role === 'admin' ? 'Administrator' : 'Clinician')}</span>`
    : '<span class="badge">Patient</span>';

  return `<header class="hd">${brand()}
    <div class="acts">${roleBadge}<span style="font-size:14px">${esc(session.displayName)}</span>
      <a class="btn o" data-action="signout">Sign out</a></div></header>
    <div class="shell">
      <nav class="snav">${links.map(([key, label]) =>
        `<a href="#/${key}" class="${key === active ? 'on' : ''}">${label}</a>`).join('')}
        <p class="snav-note">🛡 Your records are private to your account.</p></nav>
      <main class="main">${body}</main>
    </div>`;
}

export function alertBox(error) {
  if (!error) return '';
  const details = error.details?.length
    ? `<ul class="alert-list">${error.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : '';
  return `<div class="note r" role="alert"><b>${esc(error.message)}</b>${details}</div>`;
}

export function flashBox(flash) {
  if (!flash) return '';
  return `<div class="note ${flash.tone === 'ok' ? 'g' : 'w'}" role="status">${esc(flash.message)}</div>`;
}

export const emergencyNote = () =>
  `<div class="note r"><b>🚨 Call 911 now if you have:</b>${EMERGENCY_TEXT}</div>`;

export const notDiagnosisNote = () =>
  `<div class="note w"><b>This is not a diagnosis</b>Informational guidance only. It cannot rule out
   serious illness or replace a clinician.</div>`;

export const spinner = (label = 'Loading…') =>
  `<div class="loading" role="status"><span class="spin"></span>${esc(label)}</div>`;

/** Level → presentation tone. Keeps colour decisions out of the views. */
export const levelTone = level =>
  ({ emergency: 'r', same_day: 'w', routine: 'g' }[level] ?? 'w');

export const levelLabel = level =>
  ({ emergency: 'Emergency', same_day: 'Same day', routine: 'Routine' }[level] ?? level);

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return esc(value);
  return date.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return esc(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const empty = text => `<p class="empty">${esc(text)}</p>`;
