// ============================================================================
// PRESENTATION LAYER (browser) - the doctor / admin workspace.
//
// Two screens: the open case queue (where escalation happens) and the list of
// already-escalated cases. Guests and patients never reach either.
// ============================================================================
import {
  appShell, esc, alertBox, flashBox, formatDateTime, levelTone, levelLabel,
  empty, spinner
} from '../ui/components.js';
import { api } from '../api/client.js';
import { view, takeFlash, session } from '../state/store.js';

const SPECIALTIES = ['Cardiology', 'Neurology', 'Pulmonology', 'Internal Medicine',
  'Gastroenterology', 'Behavioral Health', 'Allergy & Immunology', 'Emergency Medicine'];

export const clinical = {
  async load() {
    const [cases, specialists] = await Promise.all([
      api.clinical.cases(),
      api.clinical.specialists()
    ]);
    view.data = { ...cases, ...specialists };
  },

  render() {
    const d = view.data;
    if (!d) return appShell('clinical', spinner());

    return appShell('clinical', `
      ${flashBox(takeFlash())}${alertBox(view.error)}
      <span class="badge">🩺 ${esc(session.user.role === 'admin' ? 'Administrator' : 'Clinician')} workspace</span>
      <h1 style="margin-top:12px">Open case queue</h1>
      <p>Symptom checks from registered patients that have not yet been escalated, most urgent first.
         Guest checks are never stored, so they never appear here.</p>

      <div class="note w"><b>What escalation does</b>
        Flagging a case for special treatment automatically assigns a specialist, notifies the
        patient by their chosen channels, and books a priority appointment — in one step.</div>

      ${d.cases.length ? d.cases.map(c => caseCard(c)).join('') : `<div class="card">
        ${empty('No open cases. Every stored symptom check has been reviewed.')}</div>`}

      <div class="card" style="margin-top:24px"><h3>Specialist availability</h3>
        <div class="spec-grid">${d.specialists.map(s => `<div class="spec">
          <b>${esc(s.name)}</b><small>${esc(s.specialty)}</small>
          <span class="pill ${s.active_cases > 1 ? 'w' : 'g'}">${s.active_cases} active</span>
        </div>`).join('')}</div>
      </div>`);
  }
};

function caseCard(c) {
  return `<div class="card case">
    <div class="card-head">
      <div><h3>${esc(c.first_name)} ${esc(c.last_name)}</h3>
        <small class="muted">${esc(c.email)}${c.phone ? ` · ${esc(c.phone)}` : ''} ·
          submitted ${formatDateTime(c.created_at)}</small></div>
      <span class="pill ${levelTone(c.level)}">${levelLabel(c.level)}</span>
    </div>

    <p><b>${esc(c.headline)}</b></p>
    <ul class="reasons">${c.rationale.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    ${c.free_text ? `<p class="fineprint">Patient's own words: "${esc(c.free_text)}"</p>` : ''}

    <form class="escalate" data-form="escalate" data-id="${c.id}">
      <div class="escalate-row">
        <div><label for="sp-${c.id}">Assign to specialty</label>
          <select id="sp-${c.id}" name="specialty">
            <option value="">Auto-select from symptoms</option>
            ${SPECIALTIES.map(s => `<option>${esc(s)}</option>`).join('')}
          </select></div>
        <div><label for="pr-${c.id}">Priority</label>
          <select id="pr-${c.id}" name="priority">
            <option value="high">High</option><option value="urgent">Urgent</option>
          </select></div>
      </div>
      <label for="nt-${c.id}">Clinical note (optional)</label>
      <input id="nt-${c.id}" name="notes" placeholder="Why this needs special treatment…">
      <button class="btn w danger-solid" type="submit" style="margin-top:14px">
        🚨 Escalate for special treatment</button>
    </form>
  </div>`;
}

export const escalations = {
  async load() { view.data = await api.clinical.escalations(); },

  render() {
    const d = view.data;
    if (!d) return appShell('escalations', spinner());

    return appShell('escalations', `
      ${flashBox(takeFlash())}${alertBox(view.error)}
      <span class="badge">🚨 Escalated cases</span>
      <h1 style="margin-top:12px">Cases flagged for special treatment</h1>
      <p>Every case here has an assigned specialist, a notified patient and a priority appointment.</p>

      ${d.escalations.length ? d.escalations.map(e => `<div class="card case">
        <div class="card-head">
          <div><h3>${esc(e.case_ref)} — ${esc(e.first_name)} ${esc(e.last_name)}</h3>
            <small class="muted">Raised ${formatDateTime(e.created_at)} ·
              ${esc(e.level ? levelLabel(e.level) : '')}</small></div>
          <span class="pill ${e.status === 'resolved' ? 'g' : e.priority === 'urgent' ? 'r' : 'w'}">
            ${esc(e.status.replace(/_/g, ' '))}</span>
        </div>
        <div class="effects">
          <div><small>Flagged</small><b>${esc(e.status.replace(/_/g, ' '))} · ${esc(e.priority)}</b></div>
          <div><small>Specialist</small><b>${esc(e.specialist_name ?? 'Pending')}</b>
            ${e.specialist_specialty ? `<small>${esc(e.specialist_specialty)}</small>` : ''}</div>
          <div><small>Patient notified</small><b>${esc(e.email)}</b></div>
          <div><small>Priority appointment</small><b>#${e.appointment_id ?? '—'}</b></div>
        </div>
        ${e.notes ? `<p class="fineprint">Note: ${esc(e.notes)}</p>` : ''}
        <div class="row">
          ${['in_review', 'resolved'].map(status => e.status === status ? '' :
            `<button class="btn o sm" data-action="case-status" data-id="${e.id}" data-status="${status}">
              Mark ${status.replace(/_/g, ' ')}</button>`).join('')}
        </div>
      </div>`).join('') : `<div class="card">${empty('No cases have been escalated yet.')}</div>`}`);
  }
};
