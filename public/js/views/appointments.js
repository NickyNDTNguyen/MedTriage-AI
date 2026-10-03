// ============================================================================
// PRESENTATION LAYER (browser) - appointments. Registered patients only;
// the router never routes a guest here, and the API would refuse anyway.
// ============================================================================
import {
  appShell, esc, alertBox, flashBox, formatDateTime, empty, spinner
} from '../ui/components.js';
import { api } from '../api/client.js';
import { view, takeFlash } from '../state/store.js';

export const appointments = {
  async load() {
    const [list, clinicians] = await Promise.all([
      api.appointments.list(),
      api.appointments.clinicians()
    ]);
    view.data = { ...list, ...clinicians };
  },

  render() {
    const d = view.data;
    if (!d) return appShell('appointments', spinner());

    const upcoming = d.appointments.filter(a => a.status === 'scheduled');
    const past = d.appointments.filter(a => a.status !== 'scheduled');

    return appShell('appointments', `
      ${flashBox(takeFlash())}${alertBox(view.error)}
      <span class="badge">📅 Appointments</span>
      <h1 style="margin-top:12px">Your appointments</h1>
      <p>Booking is available to registered patients. Reminders are sent to the channels you turned
         on in <a href="#/profile">your profile</a>.</p>

      <div class="two-col" style="padding:24px 0 0">
        <div>
          <div class="card"><h3>Upcoming</h3>
            ${upcoming.length ? upcoming.map(a => `
              <div class="appt ${a.priority === 'priority' ? 'priority' : ''}">
                <div>
                  <b>${esc(a.clinician)}</b>
                  ${a.priority === 'priority' ? '<span class="pill r">Priority</span>' : ''}
                  <br><small>${esc(a.specialty)} · ${formatDateTime(a.scheduled_at)}</small>
                  ${a.reason ? `<br><small class="muted">${esc(a.reason)}</small>` : ''}
                </div>
                <div class="appt-actions">
                  <button class="btn o sm" data-action="remind-appt" data-id="${a.id}">Send reminder</button>
                  <button class="btn o sm danger" data-action="cancel-appt" data-id="${a.id}">Cancel</button>
                </div>
              </div>`).join('') : empty('No upcoming appointments.')}
          </div>

          ${past.length ? `<div class="card" style="margin-top:20px"><h3>Past and cancelled</h3>
            ${past.map(a => `<div class="li"><span>${esc(a.clinician)} · ${formatDateTime(a.scheduled_at)}</span>
              <span class="pill">${esc(a.status)}</span></div>`).join('')}</div>` : ''}
        </div>

        <div>
          <form class="card" data-form="book-appointment" novalidate>
            <h3>Book a new appointment</h3>
            <label for="ap-clinician">Clinician</label>
            <select id="ap-clinician" name="clinician" required>
              ${d.clinicians.map(c =>
                `<option value="${esc(c.name)}" data-specialty="${esc(c.specialty)}">
                  ${esc(c.name)} — ${esc(c.specialty)}</option>`).join('')}
            </select>
            <label for="ap-when">Date and time</label>
            <input id="ap-when" name="scheduledAt" type="datetime-local" required>
            <label for="ap-reason">Reason (optional)</label>
            <input id="ap-reason" name="reason" placeholder="e.g. Blood pressure follow-up">
            <button class="btn w" type="submit" style="margin-top:16px">Book appointment</button>
            <p class="fineprint" style="margin-top:12px">You will get a confirmation right away and a
               reminder before the visit.</p>
          </form>

          <div class="note w"><b>🛡 Registered patients only</b>
            Appointments must attach to a patient record, so guests cannot book. Guest symptom
            checks stay available to everyone.</div>
        </div>
      </div>`);
  }
};
