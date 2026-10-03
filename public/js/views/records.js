// PRESENTATION LAYER (browser) - the patient's chart.
import {
  appShell, esc, alertBox, flashBox, formatDate, formatDateTime,
  levelTone, levelLabel, empty, spinner
} from '../ui/components.js';
import { api } from '../api/client.js';
import { view, takeFlash } from '../state/store.js';
import { categoryIcon } from './dashboard.js';

export const records = {
  async load() { view.data = await api.patient.records(); },

  render() {
    const d = view.data;
    if (!d) return appShell('records', spinner());

    return appShell('records', `
      ${flashBox(takeFlash())}${alertBox(view.error)}
      <span class="badge">📄 Health records</span>
      <h1 style="margin-top:12px">Records and symptom history</h1>
      <p>Everything here belongs to your account only. Delete any entry at any time.</p>

      <div class="two-col" style="padding:24px 0 0">
        <div>
          <div class="card"><h3>Timeline</h3>
            ${d.records.length ? d.records.map(r => `<div class="li record">
              <span>${categoryIcon(r.category)} <b>${esc(r.title)}</b>
                ${r.detail ? `<br><small class="muted">${esc(r.detail)}</small>` : ''}</span>
              <span class="record-side"><small>${formatDate(r.recorded_at)}</small>
                <button class="btn o sm danger" data-action="delete-record" data-id="${r.id}"
                  aria-label="Delete ${esc(r.title)}">Delete</button></span>
            </div>`).join('') : empty('Your chart is empty. Add an entry on the right.')}
          </div>

          <div class="card" style="margin-top:20px"><h3>Symptom check history</h3>
            ${d.assessments.length ? d.assessments.map(a => `<div class="li">
              <span><b>${esc(a.headline)}</b><br>
                <small class="muted">${formatDateTime(a.created_at)}</small>
                ${a.escalated ? '<span class="pill r">Escalated</span>' : ''}</span>
              <span class="pill ${levelTone(a.level)}">${levelLabel(a.level)}</span></div>`).join('')
              : empty('No symptom checks yet.')}
          </div>
        </div>

        <div>
          <form class="card" data-form="add-record" novalidate>
            <h3>Add to my chart</h3>
            <label for="rc-category">Type</label>
            <select id="rc-category" name="category" required>
              <option value="visit">🩺 Visit</option>
              <option value="lab">🧪 Lab result</option>
              <option value="medication">💊 Medication</option>
              <option value="note">📝 Note</option>
            </select>
            <label for="rc-title">Title</label>
            <input id="rc-title" name="title" placeholder="e.g. Cardiology follow-up" required>
            <label for="rc-detail">Details (optional)</label>
            <input id="rc-detail" name="detail" placeholder="What happened, results, dosage…">
            <label for="rc-date">Date</label>
            <input id="rc-date" name="recordedAt" type="date">
            <button class="btn w" type="submit" style="margin-top:16px">Add entry</button>
          </form>

          <div class="note w"><b>ℹ️ Used by the assistant</b>
            With your consent, the assistant reads your five most recent entries so its answers fit
            your situation. It always tells you what it used.</div>
        </div>
      </div>`);
  }
};
