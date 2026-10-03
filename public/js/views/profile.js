// PRESENTATION LAYER (browser) - personal information and reminder settings.
import {
  appShell, esc, alertBox, flashBox, formatDateTime, empty, spinner
} from '../ui/components.js';
import { api } from '../api/client.js';
import { view, takeFlash } from '../state/store.js';

const COVERAGE = ['Original Medicare', 'Medicare Advantage', 'Private insurance', 'Other / none'];

export const profile = {
  async load() { view.data = await api.patient.profile(); },

  render() {
    const d = view.data;
    if (!d) return appShell('profile', spinner());
    const u = d.user;

    return appShell('profile', `
      ${flashBox(takeFlash())}${alertBox(view.error)}
      <span class="badge">⚙️ Profile</span>
      <h1 style="margin-top:12px">Personal information</h1>
      <p>This is the information attached to your medical records and used for reminders.</p>

      <div class="two-col" style="padding:24px 0 0">
        <div>
          <form class="card" data-form="update-profile" novalidate>
            <h3>Your details</h3>
            <div class="two">
              <div><label for="pf-first">First name</label>
                <input id="pf-first" name="firstName" value="${esc(u.first_name)}" required></div>
              <div><label for="pf-last">Last name</label>
                <input id="pf-last" name="lastName" value="${esc(u.last_name)}" required></div>
            </div>
            <label for="pf-email">Email</label>
            <input id="pf-email" value="${esc(u.email)}" disabled>
            <small class="hint">Your email is your sign-in and cannot be changed here.</small>
            <div class="two">
              <div><label for="pf-phone">Mobile number</label>
                <input id="pf-phone" name="phone" type="tel" value="${esc(u.phone ?? '')}"
                  placeholder="+1-555-0100"></div>
              <div><label for="pf-dob">Date of birth</label>
                <input id="pf-dob" name="dateOfBirth" type="date" value="${esc(u.date_of_birth ?? '')}"></div>
            </div>
            <label for="pf-coverage">Coverage type</label>
            <select id="pf-coverage" name="coverageType">
              <option value="">Prefer not to say</option>
              ${COVERAGE.map(c =>
                `<option ${u.coverage_type === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
            <button class="btn w" type="submit" style="margin-top:16px">Save changes</button>
          </form>

          <form class="card" data-form="update-reminders" style="margin-top:20px">
            <h3>Appointment reminders</h3>
            <p class="fineprint">Reminders are simulated in this academic project — every message is
               recorded in the outbox below instead of being delivered.</p>
            <label class="chk"><input type="checkbox" name="reminderEmail"
              ${u.reminder_email ? 'checked' : ''}> ✉️ Email reminders to ${esc(u.email)}</label>
            <label class="chk"><input type="checkbox" name="reminderSms"
              ${u.reminder_sms ? 'checked' : ''} ${u.phone ? '' : 'disabled'}>
              📱 Text reminders${u.phone ? ` to ${esc(u.phone)}` : ' — add a phone number first'}</label>
            <button class="btn w" type="submit" style="margin-top:16px">Save preferences</button>
          </form>
        </div>

        <div>
          <div class="card"><h3>📬 Notification outbox</h3>
            <p class="fineprint">Everything the platform would have sent you.</p>
            ${d.notifications.length ? d.notifications.map(n => `<div class="outbox">
              <div class="outbox-head"><span>${n.channel === 'email' ? '✉️ Email' : '📱 Text'}
                → ${esc(n.recipient)}</span><small>${formatDateTime(n.created_at)}</small></div>
              ${n.subject ? `<b>${esc(n.subject)}</b>` : ''}
              <p class="fineprint">${esc(n.body)}</p></div>`).join('')
              : empty('No messages yet.')}
          </div>

          <div class="note w"><b>🛡 Privacy</b>Your records are visible to you, and to a clinician
            only when you have run a symptom check they are reviewing.</div>
        </div>
      </div>`);
  }
};
