// ============================================================================
// PRESENTATION LAYER (browser) - the symptom checker.
//
// Works for guests and for signed-in patients. The only difference the UI
// makes is what it SAYS about storage; the decision itself is the server's
// (TriageService), and the server tells us via `result.stored`.
// ============================================================================
import {
  brand, footer, alertBox, emergencyNote, notDiagnosisNote, esc, levelTone
} from '../ui/components.js';
import { guest, session, view, QUESTIONNAIRE } from '../state/store.js';

export const check = {
  render() {
    const step = guest.step;
    const total = QUESTIONNAIRE.questions.length || 4;
    return header(step, total)
      + (step === 0 ? intro()
       : step <= total ? question(step, total)
       : results());
  }
};

function header(step, total) {
  const inProgress = step > 0 && step <= total;
  return `<header class="hd">${brand()}
    <span class="badge">${session.user ? `👤 ${esc(session.user.first_name)}` : '👤 Guest session'}
      ${inProgress ? ` · Step ${step} of ${total}` : ''}</span>
    <div class="acts">
      <a class="btn o" data-action="exit-check">${session.user ? 'Back to dashboard' : '🗑 Exit and delete'}</a>
    </div></header>`;
}

function intro() {
  const guestCopy = !session.user;
  return `<section class="hero">
  <div>
    <span class="badge">${guestCopy ? '🛡 No account required' : '📄 Will be saved to your chart'}</span>
    <h1 style="margin-top:16px">Let's help you decide what to do next.</h1>
    <p>Answer a few questions about how you feel. You will get general urgency guidance and ideas to
       discuss with a clinician. If none of the options fit how you feel, the
       <a href="#/assistant">assistant</a> can help you put it into words first.</p>
    ${notDiagnosisNote()}
    ${emergencyNote()}
  </div>
  <div class="card">
    <span class="badge">Before you begin</span>
    <h2 style="margin-top:12px">Your privacy and consent</h2>
    <p class="fineprint">⏱ 3–5 minutes &nbsp;·&nbsp;
      ${guestCopy ? '🗑 Nothing is saved' : '📄 Saved to your records'} &nbsp;·&nbsp; 🔒 Private</p>
    ${alertBox(view.error)}
    <label class="chk"><input type="checkbox" data-consent="0" ${guest.consent[0] ? 'checked' : ''}>
      I understand this is general information, not a diagnosis.</label>
    <label class="chk"><input type="checkbox" data-consent="1" ${guest.consent[1] ? 'checked' : ''}>
      ${guestCopy
        ? 'I consent to my answers being processed for this session only, and not stored.'
        : 'I consent to this symptom check being saved to my medical records.'}</label>
    <button class="btn w" data-action="begin-check"
      ${guest.consent[0] && guest.consent[1] ? '' : 'disabled'}>Begin symptom check →</button>
  </div>
</section>${footer()}`;
}

function question(step, total) {
  const q = QUESTIONNAIRE.questions[step - 1];
  if (!q) return `<div class="sec">${alertBox({ message: 'Could not load the questions.' })}</div>`;
  const chosen = guest.answers[step - 1];

  return `<div class="two-col">
  <div class="card">
    <div class="prog">${Array.from({ length: total }, (_, i) =>
      `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>
    <small class="step-label">QUESTION ${step} OF ${total}</small>
    <h2>${esc(q.prompt)}</h2>
    <p>${esc(q.help)}</p>
    ${alertBox(view.error)}
    <div role="radiogroup" aria-label="${esc(q.prompt)}">
      ${q.options.map((option, i) => `<button class="opt ${chosen === i ? 'on' : ''}"
        role="radio" aria-checked="${chosen === i}" data-pick="${i}">${esc(option)}</button>`).join('')}
    </div>
    <div class="nav-row">
      <button class="btn o" data-action="back-check">← Back</button>
      <button class="btn" data-action="next-check" ${chosen == null ? 'disabled' : ''}>
        ${step === total ? 'See guidance →' : 'Next →'}</button>
    </div>
  </div>
  <div>
    <div class="card"><h3>Your answers</h3>
      ${guest.answers.length
        ? guest.answers.map((a, i) => `<p class="answer-recap"><b>${esc(QUESTIONNAIRE.questions[i].prompt)}</b><br>
            ${esc(QUESTIONNAIRE.questions[i].options[a])}</p>`).join('')
        : '<p class="empty">Nothing yet.</p>'}
    </div>
    ${guest.freeText ? `<div class="card"><h3>From the assistant</h3>
      <p class="fineprint">"${esc(guest.freeText)}"</p>
      <p class="fineprint">This will be folded into your guidance.</p></div>` : ''}
    <div class="note r"><b>🚨 Emergency?</b>Call 911 for severe or sudden symptoms.</div>
    ${!session.user ? '<div class="note w">🛡 Guest answers are not added to any profile and are deleted when this session ends.</div>' : ''}
  </div>
</div>`;
}

function results() {
  const r = guest.result;
  if (!r) return `<div class="sec">${alertBox(view.error ?? { message: 'No result to show.' })}
    <a class="btn" href="#/check" data-action="restart-check">Start over</a></div>`;

  return `<div class="sec results">
  <span class="badge">🧭 Guidance ready</span>
  <h1 style="margin-top:12px">Here's your guidance</h1>
  ${notDiagnosisNote()}
  <div class="two-col" style="padding:0">
    <div class="card">
      <div class="note ${levelTone(r.level)} headline">
        <b>${esc(r.headline)}</b>${esc(r.summary)}</div>

      <h3>Why we suggested this</h3>
      <ul class="reasons">${r.rationale.map(line => `<li>${esc(line)}</li>`).join('')}</ul>

      <h3 style="margin-top:20px">Questions for your clinician</h3>
      <ul class="reasons">${r.questionsForClinician.map(q => `<li>${esc(q)}</li>`).join('')}</ul>

      <p class="fineprint" style="margin-top:20px">Suggested area of care:
        <b>${esc(r.suggestedSpecialty)}</b></p>
    </div>

    <div>
      <div class="note r headline"><b>🚨 Call 911 if:</b>Symptoms are severe or come on suddenly.</div>
      <div class="note ${r.stored ? 'g' : 'w'}">
        <b>${r.stored ? '📄 Saved to your records' : '🗑 Nothing was saved'}</b>${esc(r.privacyNote)}</div>

      ${r.stored ? `<div class="card">
          <h3>Next steps</h3>
          <a class="btn w" href="#/appointments">Book an appointment</a>
          <a class="btn o w" href="#/records" style="margin-top:8px">View my records</a>
        </div>`
        : `<div class="card">
          <h3>Want to keep this?</h3>
          <p>Create a free account to save this guidance, book an appointment, and let a clinician
             review your case.</p>
          <a class="btn w" href="#/register">Create account</a>
          <p class="fineprint" style="margin-top:12px">Appointment booking and clinical escalation are
             available to registered patients only.</p>
        </div>`}
    </div>
  </div>
  <div class="row">
    <button class="btn o" data-action="restart-check">↺ Start over</button>
    <button class="btn o" data-action="exit-check">
      ${session.user ? 'Back to dashboard' : '🗑 Delete session and exit'}</button>
  </div>
</div>${footer()}`;
}
