// PRESENTATION LAYER (browser) - marketing / entry page.
import { publicHeader, footer, NAME, brand } from '../ui/components.js';

export const landing = {
  render: () => `${publicHeader()}
<section class="hero">
  <div>
    <span class="badge">♥ Care guidance, built for safety</span>
    <h1 style="margin-top:16px">Know what to do next when you're not feeling well.</h1>
    <p>${NAME} helps you understand how urgent your symptoms may be, keeps your health records in one
       place, and prepares you for the conversation with your clinician.</p>
    <div class="row">
      <a class="btn" href="#/check">Start guest symptom check →</a>
      <a class="btn o" href="#/register">Create free account</a>
    </div>
    <p class="fineprint">✓ No diagnosis claims &nbsp; ✓ Private by design &nbsp; ✓ Accessible</p>
  </div>
  <div class="card hero-card">
    <div class="hero-emoji">🩺</div>
    <h3>Guidance in minutes</h3>
    <p>Answer a few questions and get clear next steps — no account needed.</p>
  </div>
</section>

<section class="band strip"><b>🛡 Safety first:</b> ${NAME} never replaces emergency care.
  If this is an emergency, call 911.</section>

<section class="sec" id="how">
  <span class="badge">How it works</span>
  <h2 style="margin:12px 0 24px">Three simple steps</h2>
  <div class="grid3">
    <div class="card"><div class="ico">1️⃣</div><h3>Describe symptoms</h3>
      <p>Answer short questions, or type freely to the assistant if none of the options fit.</p></div>
    <div class="card"><div class="ico">2️⃣</div><h3>Get urgency guidance</h3>
      <p>See whether to seek emergency, same-day, or routine care — and why.</p></div>
    <div class="card"><div class="ico">3️⃣</div><h3>Prepare your visit</h3>
      <p>Take the suggested questions to your clinician, or book directly with an account.</p></div>
  </div>
</section>

<section class="sec">
  <span class="badge">Why ${NAME}</span>
  <h2 style="margin-top:12px;max-width:640px">Clear guidance without the guesswork</h2>
  <div class="grid3">
    <div class="card"><div class="ico">🚫</div><h3>No diagnosis</h3>
      <p>We share urgency guidance and questions to ask — never a diagnosis.</p></div>
    <div class="card"><div class="ico">ℹ️</div><h3>Transparent sources</h3>
      <p>The assistant tells you exactly which information it used for each answer.</p></div>
    <div class="card"><div class="ico">🗑</div><h3>Guest means guest</h3>
      <p>Use the checker without an account. Nothing you type is written to our database.</p></div>
  </div>
</section>

<section class="sec band">
  <span class="badge" style="background:var(--card)">With a free account</span>
  <h2 style="margin:12px 0 24px">Everything a guest gets, plus a record that lasts</h2>
  <div class="grid3">
    <div class="card"><div class="ico">📅</div><h3>Appointments</h3>
      <p>Book visits and get email and text reminders. Registered patients only.</p></div>
    <div class="card"><div class="ico">📄</div><h3>Medical records</h3>
      <p>Keep visits, labs and medicines together, and carry them into every symptom check.</p></div>
    <div class="card"><div class="ico">🚨</div><h3>Clinical escalation</h3>
      <p>If a doctor flags your case for special treatment, you get a specialist and a priority slot.</p></div>
  </div>
</section>

<section class="sec" id="safe">
  <div class="card cta">
    <div><span class="badge">Guest checker</span>
      <h2 style="margin-top:12px">Try it now, no account needed</h2>
      <p>Your answers are never saved, and they are gone when the session ends.</p></div>
    <a class="btn" href="#/check">Begin guest check →</a>
  </div>
</section>

<section class="sec band cta">
  <div><h2>Ready to take charge of your health?</h2>
    <p>Create a secure account to save records, book appointments and chat with the assistant.</p></div>
  <a class="btn" href="#/register">🔒 Create account</a>
</section>
${footer()}`
};
