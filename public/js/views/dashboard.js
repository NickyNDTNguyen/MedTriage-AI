// PRESENTATION LAYER (browser) - patient dashboard.
import {
  appShell, esc, alertBox, flashBox, formatDateTime, formatDate,
  levelTone, levelLabel, empty, spinner
} from '../ui/components.js';
import { api } from '../api/client.js';
import { view, takeFlash } from '../state/store.js';

export const dashboard = {
  async load() { view.data = await api.patient.dashboard(); },

  render() {
    const d = view.data;
    if (!d) return appShell('dashboard', spinner());

    return appShell('dashboard', `
      ${flashBox(takeFlash())}${alertBox(view.error)}
      <span class="badge">Welcome back</span>
      <h1 style="margin-top:12px">Hello, ${esc(d.user.first_name)}</h1>

      ${d.hasEscalation ? `<div class="note r"><b>🚨 A clinician escalated your case</b>
        Your case has been flagged for special treatment and a specialist has been assigned.
        See the details below.</div>` : ''}

      <div class="grid3">
        <div class="card stat"><div class="ico">📅</div>
          <h3>${d.nextAppointment ? formatDate(d.nextAppointment.scheduled_at) : 'None'}</h3>
          <p>${d.nextAppointment
            ? `Next visit · ${esc(d.nextAppointment.clinician)}`
            : 'No upcoming appointments'}</p>
          <a href="#/appointments">${d.nextAppointment ? 'View all' : 'Book one'} →</a></div>

        <div class="card stat"><div class="ico">🧭</div>
          <h3>${d.assessmentCount}</h3>
          <p>Symptom check${d.assessmentCount === 1 ? '' : 's'} on file</p>
          <a href="#/check">Start a new check →</a></div>

        <div class="card stat"><div class="ico">📄</div>
          <h3>${d.recentRecords.length}</h3>
          <p>Recent record${d.recentRecords.length === 1 ? '' : 's'}</p>
          <a href="#/records">Open my chart →</a></div>
      </div>

      <div class="two-col" style="padding:24px 0 0">
        <div>
          ${d.lastAssessment ? `<div class="card">
            <div class="card-head"><h3>Most recent symptom check</h3>
              <span class="pill ${levelTone(d.lastAssessment.level)}">${levelLabel(d.lastAssessment.level)}</span></div>
            <p><b>${esc(d.lastAssessment.headline)}</b></p>
            <p class="fineprint">${formatDateTime(d.lastAssessment.created_at)}</p>
            <ul class="reasons">${d.lastAssessment.rationale.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          </div>` : `<div class="card"><h3>No symptom checks yet</h3>
            <p>Run one whenever something does not feel right.</p>
            <a class="btn" href="#/check">Start a symptom check →</a></div>`}

          ${d.escalations.length ? `<div class="card" style="margin-top:20px">
            <h3>Escalated cases</h3>
            ${d.escalations.map(e => `<div class="li">
              <span><b>${esc(e.case_ref)}</b><br>
                <small>${esc(e.specialist_name ?? 'Specialist pending')}
                  ${e.specialist_specialty ? `· ${esc(e.specialist_specialty)}` : ''}</small></span>
              <span class="pill ${e.status === 'resolved' ? 'g' : 'r'}">
                ${esc(e.status.replace(/_/g, ' '))}</span></div>`).join('')}
          </div>` : ''}

          <div class="card" style="margin-top:20px">
            <h3>Recent records</h3>
            ${d.recentRecords.length ? d.recentRecords.map(r => `<div class="li">
              <span>${categoryIcon(r.category)} ${esc(r.title)}</span>
              <small>${formatDate(r.recorded_at)}</small></div>`).join('')
              : empty('Nothing on your chart yet.')}
          </div>
        </div>

        <div>
          <div class="card"><span class="badge">✨ AI assistant</span>
            <h3 style="margin-top:12px">Hard to describe a symptom?</h3>
            <p>Type it in your own words and the assistant will help turn it into something a
               clinician can use.</p>
            <a class="btn w" href="#/assistant">Open assistant</a></div>

          <div class="card" style="margin-top:20px"><h3>📬 Notification outbox</h3>
            <p class="fineprint">Simulated — messages are recorded, not actually delivered.</p>
            ${d.notifications.length ? d.notifications.slice(0, 5).map(n => `<div class="li">
              <span>${n.channel === 'email' ? '✉️' : '📱'} ${esc(n.subject ?? n.category)}</span>
              <small>${formatDate(n.created_at)}</small></div>`).join('')
              : empty('No messages yet.')}
            <a href="#/profile" class="fineprint">Manage reminder settings →</a></div>
        </div>
      </div>`);
  }
};

export function categoryIcon(category) {
  return { visit: '🩺', lab: '🧪', medication: '💊', triage: '🧭', note: '📝' }[category] ?? '📄';
}
