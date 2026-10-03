// PRESENTATION LAYER (browser) - sign-in and registration.
import { brand, footer, alertBox, NAME, esc } from '../ui/components.js';
import { view } from '../state/store.js';

export const signin = {
  render: () => `<div class="auth">
  <div class="side">${brand()}
    <span class="badge">♥ Welcome back</span>
    <h1 style="margin-top:16px">Your health, organized and private.</h1>
    <p>Sign in to see your dashboard, records, appointments and assistant.</p>
    <p class="side-list">✓ Sessions expire automatically<br>✓ You control and can delete your data<br>
       ✓ Never a substitute for emergency care</p>
  </div>
  <div>
    <div class="auth-top"><a href="#/">← Back to home</a><a href="#/register">New here? Create an account</a></div>
    <form class="form" data-form="signin" novalidate>
      <h1 style="font-size:36px">Sign in</h1>
      <p>Use your ${NAME} account.</p>
      ${alertBox(view.error)}
      <label for="si-email">Email</label>
      <input id="si-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
      <label for="si-password">Password</label>
      <input id="si-password" name="password" type="password" autocomplete="current-password" required>
      <button class="btn w" type="submit">🔒 Sign in</button>
      <p class="or">or</p>
      <a class="btn o w" href="#/check">Continue as a guest symptom checker</a>
      <div class="note r"><b>Emergency?</b>Call 911. Do not use this site for urgent symptoms.</div>
      <details class="demo">
        <summary>Demo accounts for this academic project</summary>
        <table class="demo-table">
          <tr><th>Patient</th><td>patient@medtriage.test</td><td>Patient123</td></tr>
          <tr><th>Patient</th><td>james@medtriage.test</td><td>Patient123</td></tr>
          <tr><th>Doctor</th><td>doctor@medtriage.test</td><td>Doctor123</td></tr>
          <tr><th>Admin</th><td>admin@medtriage.test</td><td>Admin1234</td></tr>
        </table>
      </details>
    </form>
  </div>
</div>`
};

export const register = {
  render: () => `<div class="auth">
  <div class="side">${brand()}
    <span class="badge">🛡 Private by design</span>
    <h1 style="margin-top:16px">Create your ${NAME} account.</h1>
    <p>Keep your records, medicines and questions in one secure place — and unlock appointment
       booking with email and text reminders.</p>
    <p class="side-list">Guests can always use the symptom checker without signing up.</p>
  </div>
  <div>
    <div class="auth-top"><a href="#/">← Back to home</a><a href="#/signin">Already have an account? Sign in</a></div>
    <form class="form" data-form="register" novalidate>
      <h1 style="font-size:34px">Create account</h1>
      <p>All fields marked * are required.</p>
      ${alertBox(view.error)}

      <div class="two">
        <div><label for="rg-first">First name *</label>
          <input id="rg-first" name="firstName" autocomplete="given-name" required></div>
        <div><label for="rg-last">Last name *</label>
          <input id="rg-last" name="lastName" autocomplete="family-name" required></div>
      </div>

      <label for="rg-email">Email *</label>
      <input id="rg-email" name="email" type="email" autocomplete="email" required>

      <div class="two">
        <div><label for="rg-pw">Password *</label>
          <input id="rg-pw" name="password" type="password" autocomplete="new-password" required>
          <small class="hint">At least 8 characters, with a letter and a number.</small></div>
        <div><label for="rg-pw2">Confirm password *</label>
          <input id="rg-pw2" name="confirmPassword" type="password" autocomplete="new-password" required></div>
      </div>

      <div class="two">
        <div><label for="rg-phone">Mobile number</label>
          <input id="rg-phone" name="phone" type="tel" placeholder="+1-555-0100" autocomplete="tel">
          <small class="hint">Needed for text reminders.</small></div>
        <div><label for="rg-dob">Date of birth</label>
          <input id="rg-dob" name="dateOfBirth" type="date"></div>
      </div>

      <label for="rg-role">Account type *</label>
      <select id="rg-role" name="role" data-role-select>
        <option value="patient">Patient — symptom checks, records, appointments</option>
        <option value="doctor">Doctor / clinician — review and escalate cases</option>
        <option value="admin">Administrator — full case oversight</option>
      </select>

      <div data-role-extra hidden>
        <label for="rg-specialty">Specialty *</label>
        <input id="rg-specialty" name="specialty" placeholder="e.g. Cardiology">
      </div>

      <label for="rg-coverage">Coverage type (optional)</label>
      <select id="rg-coverage" name="coverageType">
        <option value="">Prefer not to say</option>
        <option>Original Medicare</option><option>Medicare Advantage</option>
        <option>Private insurance</option><option>Other / none</option>
      </select>

      <div class="card consent">
        <b>Consent</b>
        <label class="chk"><input type="checkbox" name="acceptedTerms" required>
          I agree to the terms and privacy notice. *</label>
        <label class="chk"><input type="checkbox" name="reminderEmail" checked>
          Send me appointment reminders by email.</label>
        <label class="chk"><input type="checkbox" name="reminderSms">
          Send me appointment reminders by text message.</label>
      </div>

      <div class="note w"><b>Your data stays yours</b>You can edit or delete any record at any time.</div>
      <button class="btn w" type="submit">Create account →</button>
    </form>
  </div>
</div>`
};
