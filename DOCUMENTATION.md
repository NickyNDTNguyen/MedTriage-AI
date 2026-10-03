# MedTriage AI — Complete Guide

**ITC6250 · Interactive System Design and Web Development**
A healthcare symptom-triage web application built on a four-layer architecture.

> **Academic project.** MedTriage AI is fictional. It is not a medical device, is not connected to
> any government or insurance system, and never produces a diagnosis — only urgency guidance.

---

## Table of contents

1. [Getting started](#1-getting-started)
2. [Who can do what](#2-who-can-do-what)
3. [Feature reference](#3-feature-reference)
4. [Workflows, step by step](#4-workflows-step-by-step)
5. [The multi-layer architecture](#5-the-multi-layer-architecture)
6. [Tracing one request through all four layers](#6-tracing-one-request-through-all-four-layers)
7. [Data model](#7-data-model)
8. [API reference](#8-api-reference)
9. [Design decisions and trade-offs](#9-design-decisions-and-trade-offs)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Getting started

### Requirements

- **Node.js 22.5 or newer.** The project uses the built-in `node:sqlite` driver, so there is no
  native module to compile. Check your version with `node --version`.
- No database server to install. SQLite lives in a single file at `data/medtriage.db`.

### Install and run

```bash
npm install
npm start
```

Open **http://localhost:3000** in a browser.

On first run the server creates the database, applies the schema, and seeds demo data. You will see:

```
  seeding demo data...
  demo data ready.

  MedTriage AI running at http://localhost:3000
  notifications: simulated   assistant: simulated
```

### Commands

| Command | What it does |
|---|---|
| `npm start` | Run the server on port 3000 |
| `PORT=4000 npm start` | Run on a different port |
| `npm run dev` | Run with auto-restart when a file changes |
| `npm run seed` | Seed the database without starting the server |
| `npm run reset` | Delete the database and re-seed from scratch |

### Demo accounts

| Role | Email | Password | What you can see |
|---|---|---|---|
| Patient | `patient@medtriage.test` | `Patient123` | Maria Alvarez — has records, an appointment, and an open case |
| Patient | `james@medtriage.test` | `Patient123` | James Okafor — an empty account, good for testing a fresh start |
| Doctor | `doctor@medtriage.test` | `Doctor123` | Dr. Noah Feld — case queue and escalation |
| Admin | `admin@medtriage.test` | `Admin1234` | Dana Reyes — same clinical powers, administrator label |

The symptom checker and the AI assistant work **without signing in at all**.

### A five-minute tour

1. Open http://localhost:3000 and click **Start guest symptom check**. Finish it. Notice the result
   says *"Nothing was saved."*
2. Sign in as `patient@medtriage.test` / `Patient123`. Look at the dashboard, then book an
   appointment and open **Profile** to see the confirmation sitting in the notification outbox.
3. Sign out, sign in as `doctor@medtriage.test` / `Doctor123`. You land on the **case queue**. Click
   **Escalate for special treatment** on Maria's case and read the green banner that appears.
4. Sign back in as the patient. The dashboard now shows the escalation, the assigned specialist, and
   a priority appointment that was created automatically.

---

## 2. Who can do what

Access is role-based. The table below is the complete policy.

| Capability | Guest | Patient | Doctor / Admin |
|---|:---:|:---:|:---:|
| Run a symptom check | ✅ | ✅ | ✅ |
| Chat with the AI assistant | ✅ | ✅ | ✅ |
| Have results saved | ❌ | ✅ | — |
| Book an appointment | ❌ | ✅ | ❌ |
| Receive email / SMS reminders | ❌ | ✅ | ❌ |
| Keep medical records | ❌ | ✅ | ❌ |
| Edit personal information | ❌ | ✅ | ✅ |
| See the open case queue | ❌ | ❌ | ✅ |
| Escalate a case | ❌ | ❌ | ✅ |
| Assign a specialist | ❌ | ❌ | ✅ (automatic) |

Two rules shape everything else:

**Guests get a diagnosis and nothing more.** A guest can use the symptom checker and the assistant,
but no appointment, no record, and no escalation. Nothing a guest types is written to the database.

**Appointment booking and case escalation require a registered patient.** Both attach to a patient
chart, and a guest does not have one.

---

## 3. Feature reference

### 3.1 Guest symptom checker

Open to anyone, no account needed.

- **Consent gate.** Two checkboxes before the first question: one acknowledging this is not a
  diagnosis, one consenting to session-only processing. The Begin button stays disabled until both
  are ticked.
- **Four questions** covering duration, main symptom, pattern on movement, and emergency warning
  signs. You can move backward and change an answer; a progress bar shows where you are.
- **Live answer recap** in the sidebar, so you can see what you have said so far.
- **Three possible outcomes**, each with its own colour and wording:

  | Level | Headline | When |
  |---|---|---|
  | 🔴 Emergency | *Call 911 now* | Any emergency warning sign was selected or described |
  | 🟠 Same day | *Contact a clinician today* | Score of 5 or more without a red flag |
  | 🟢 Routine | *Monitor and use self-care* | Below the same-day threshold |

- **Explained reasoning.** The result lists every answer that contributed, so the recommendation is
  never a black box.
- **Questions for your clinician**, tailored to the symptom category, to take into a visit.
- **Clear privacy statement** on the result itself: *"This result was not saved. It disappears when
  you close or exit this session."*

A signed-in patient sees the same flow, but the result is saved to their chart and the privacy note
changes accordingly.

### 3.2 AI assistant

For when none of the fixed options fit how you feel.

- Describe a symptom in plain words. The assistant reflects it back in clinical language.
- It **extracts structured signals** — matched symptoms, duration, red-flag phrases — and offers to
  **carry them into your symptom check**, so you do not have to repeat yourself.
- Those signals can only ever **raise** urgency, never lower it. A red-flag phrase forces an
  emergency result regardless of what was clicked in the questionnaire.
- **Source transparency.** Ask *"what did you use?"* and it tells you exactly what it read — your
  message only for a guest, or your message plus your recent records for a signed-in patient.
- **Emergency interception.** If you type something like *"I can't breathe"*, the assistant stops
  the conversation and tells you to call 911 rather than continuing to triage.
- **Guest conversations are never stored.** They live in browser memory and are posted back with
  each turn so the assistant has context without the server keeping anything.

### 3.3 Registration and sign-in

- **Role selection** at sign-up: patient, doctor, or administrator. Choosing doctor reveals a
  required specialty field.
- **Validated fields** with specific error messages: password at least 8 characters with a letter
  and a number, passwords must match, email must be valid and unique, terms must be accepted.
- **Consent checkboxes** for terms, email reminders, and text reminders.
- **Welcome message** sent on registration, visible in the notification outbox.
- Sessions are opaque tokens in an `httpOnly` cookie and expire automatically after 12 hours.

### 3.4 Patient dashboard

- Three summary cards: next appointment, symptom checks on file, recent records.
- **Escalation banner** at the top if a clinician has flagged your case.
- Your most recent symptom check with its full reasoning.
- Recent chart entries and the last few notifications.
- Shortcuts into the assistant and a new symptom check.

### 3.5 Appointments

Registered patients only.

- **Book** by choosing a clinician, a date and time, and an optional reason.
- **Conflict detection** — booking a clinician who is already taken at that time is refused with a
  specific message.
- **Past-date rejection** — you cannot book backwards in time.
- **Confirmation** sent immediately to your chosen channels.
- **Send reminder** button to re-trigger a reminder on demand (standing in for a scheduled job).
- **Cancel** with a confirmation prompt.
- **Priority appointments** created by escalation are visually distinct — red left border, a
  *Priority* pill.

### 3.6 Medical records

Registered patients only.

- **Timeline** of everything on your chart, newest first, with a category icon.
- **Add entries** in four categories: visit 🩺, lab 🧪, medication 💊, note 📝.
- **Delete any entry**, with a confirmation prompt.
- **Symptom check history** with the urgency level of each, and an *Escalated* pill where a clinician
  has acted.
- Records are read by the assistant (your five most recent) so its answers fit your situation.

### 3.7 Personal information and reminders

- Edit first name, last name, phone, date of birth, coverage type. Email is the sign-in and is
  locked.
- **Reminder preferences** for email and SMS. The SMS checkbox is disabled until a phone number is
  saved, and the server refuses the combination too.
- **Notification outbox** showing every message the platform would have sent — channel, recipient,
  subject, and full body.

### 3.8 Clinician workspace

Doctors and administrators only.

- **Open case queue**: stored symptom checks not yet escalated, sorted worst-first (emergency, then
  same-day, then routine). Each card shows the patient, contact details, urgency level, the full
  reasoning, and the patient's own words if they used the assistant.
- **Escalation form** per case: optionally override the specialty, set priority to high or urgent,
  and add a clinical note.
- **Specialist availability** panel showing the active caseload of every specialist.
- **Escalated cases** page listing every flagged case with its four effects laid out, plus buttons to
  move a case to *in review* or *resolved*.

### 3.9 Notifications

Email and SMS are **simulated** — recorded, not delivered. Every send is written to the
`notifications` table and shown in the patient's outbox, so you can see exactly what would have gone
out, to which address, on which channel.

Messages are sent for: registration welcome, appointment confirmation, appointment reminder, and case
escalation.

---

## 4. Workflows, step by step

### 4.1 Guest diagnosis — the privacy-first path

```
  Landing page
       │
       ▼
  [Start guest symptom check]
       │
       ▼
  Consent gate ──── both boxes ticked? ──── no ──► button stays disabled
       │ yes
       ▼
  Q1 duration → Q2 main symptom → Q3 pattern → Q4 warning signs
       │              ▲                │
       │              └──── [Back] ────┘
       ▼
  POST /api/triage/submit   { answers, freeText?, aiSignals? }
       │
       ▼
  TriageService.submit(input, user = null)
       │
       ├─ validateAnswers()  ──── invalid ──► 422 with specific problems
       │
       ├─ assess(answers, aiSignals)   ← pure function, no I/O
       │
       └─ user is null  ──►  RETURN RESULT.  NOTHING IS WRITTEN.
       │
       ▼
  Result screen: level, reasoning, questions for a clinician
                 "🗑 Nothing was saved"
       │
       ├─► [Start over]  → clears in-memory state, back to the consent gate
       ├─► [Create account] → registration, where results WOULD be saved
       └─► [Delete session and exit] → clears everything, back to the landing page
```

**What makes the privacy guarantee real.** The guest branch returns before touching a repository.
There is no code path from a guest submission to the database — not a disabled flag, not a cleanup
job, simply no path. You can prove it: run a complete guest check and conversation, then count rows.

```bash
node --disable-warning=ExperimentalWarning -e "import('./src/database/connection.js').then(({default:db})=>{for(const t of ['triage_assessments','chat_messages','notifications'])console.log(t,db.get('SELECT COUNT(*) n FROM '+t).n);db.close()})"
```

The counts do not move.

### 4.2 Assistant → symptom check — describing the indescribable

```
  Assistant page (guest or patient)
       │
       ▼
  "I have been feeling dizzy for 4 days and my heart is racing"
       │
       ▼
  POST /api/chat/send  { text, history }      ← guest sends its own transcript
       │
       ▼
  ChatbotService.send(text, user, guestHistory)
       │
       ├─ AiGateway.complete()
       │     ├─ match terms against SYMPTOM_LEXICON
       │     ├─ scan for EMERGENCY_PHRASES
       │     ├─ extract duration with a regex
       │     └─ compose a human reply
       │
       └─ user present?  ──► yes: append both turns to chat_messages
                         ──► no:  store nothing
       │
       ▼
  { reply, signals: { symptoms, redFlag, durationText, severity }, usedContext }
       │
       ▼
  Browser keeps `signals` in memory and offers:
       [Carry this into a symptom check →]
       │
       ▼
  Symptom check runs as normal, but submits { answers, freeText, aiSignals }
       │
       ▼
  assess() folds the signals in:
       • redFlag present      → level forced to EMERGENCY
       • highest symptom weight added to the score
       • category re-routed   → changes the suggested specialty
       • an extra rationale line: "You also mentioned …"
```

**Why signals only raise urgency.** Free text is noisy. Letting it lower a score would mean a vague
message could talk someone out of care they need. Raising only is the safe direction.

### 4.3 Registration and first sign-in

```
  [Create account]
       │
       ▼
  Form: name, email, password ×2, phone, DOB, role, coverage, consents
       │
       ▼
  POST /api/auth/register
       │
       ▼
  AuthService.register()
       │
       ├─ collect ALL validation problems, not just the first
       │     → 422 { message, details: [...] }  rendered as a bullet list
       │
       ├─ emailExists()?  → 409 conflict
       │
       ├─ hashPassword()  → scrypt with a fresh 16-byte salt
       ├─ users.create()
       ├─ NotificationService.sendWelcome()  → outbox
       └─ issue session  → httpOnly cookie, 12-hour expiry
       │
       ▼
  Router sends you to your home screen by role:
       patient        → #/dashboard
       doctor / admin → #/clinical
```

### 4.4 Booking an appointment with reminders

```
  Appointments page  (patients only — a doctor gets 403 here)
       │
       ▼
  Choose clinician + date/time + optional reason → [Book appointment]
       │
       ▼
  POST /api/appointments
       │
       ▼
  AppointmentService.book(user, input)
       │
       ├─ requirePatient(user)       ← guest → 401, doctor → 403
       ├─ validate: clinician chosen, date readable, date in the future
       ├─ findConflict(clinician, slot)  → 409 "already booked at that time"
       ├─ appointments.create()
       │
       └─ NotificationService.sendAppointmentConfirmation()
             │
             ├─ user.reminder_email → EmailGateway.send() → notifications row
             └─ user.reminder_sms   → SmsGateway.send()   → notifications row
       │
       ▼
  Green banner, list refreshes, confirmation visible in Profile → outbox
```

Reminder preferences are respected on reminders but **forced** on confirmations and escalation
notices — you always find out that something was booked or escalated for you.

### 4.5 Case escalation — the four automatic effects

This is the most involved workflow in the application.

```
  Doctor signs in → lands on the case queue (worst-first)
       │
       ▼
  Picks a case, optionally overrides specialty / priority, adds a note
       │
       ▼
  POST /api/escalations  { assessmentId, specialty?, priority?, notes? }
       │
       ▼
  EscalationService.escalate(actor, assessmentId, options)
       │
       ├─ requireClinician(actor)              → patient gets 403
       ├─ assessment exists?                   → 404 if not
       ├─ already escalated?                   → 409 "already been escalated"
       ├─ patient exists?                      → 404 if not
       ├─ route specialty from symptom category (unless overridden)
       └─ emergency level?  → priority upgraded to "urgent" automatically
       │
       ▼
  ┌─ db.transaction() ──────────────────────────────────────────────┐
  │                                                                 │
  │  EFFECT 2  assign specialist                                    │
  │            findLeastLoaded(specialty) ?? findAnyLeastLoaded()   │
  │                                                                 │
  │  EFFECT 4  create priority appointment                          │
  │            next morning 08:00, priority = 'priority'            │
  │                                                                 │
  │  EFFECT 1  flag the case                                        │
  │            escalations row, status = 'special_treatment'        │
  │            assessment marked escalated → leaves the queue       │
  │            specialist caseload incremented                      │
  │            note written to the patient's chart                  │
  │                                                                 │
  │  any failure here → ROLLBACK, none of it happened               │
  └─────────────────────────────────────────────────────────────────┘
       │  committed
       ▼
  EFFECT 3  notify the patient  ← deliberately AFTER the commit
            NotificationService.sendEscalationNotice()
              → email + SMS, forced regardless of preferences
            a gateway failure is reported, NOT rolled back
       │
       ▼
  Response carries all four effects, rendered as a banner:
  "Case MT-2026-C6D79A escalated. Assigned to Dr. Priya Raman.
   Patient notified by email and sms. Priority appointment booked."
       │
       ▼
  Patient's next sign-in shows:
       • red escalation banner on the dashboard
       • the case with its reference and assigned specialist
       • the priority appointment at the top of their list
       • two messages in the outbox
```

**Why effect 3 sits outside the transaction.** A clinical decision that has been recorded must stay
recorded. If a mail provider were inside the transaction, an outage at SendGrid would silently
un-escalate a case a doctor had already judged urgent. Instead the commit happens first, the
notification is attempted second, and a failure is reported back as `notifyError` without undoing
anything.

**How the specialist is chosen.** The symptom category routes to a specialty through
`CATEGORY_TO_SPECIALTY` — a dizziness case goes to Neurology, chest pain to Cardiology, a breathing
problem to Pulmonology. Within that specialty, the least-loaded active specialist is picked, and
their caseload is incremented so the next escalation spreads the work. A doctor can override the
specialty in the form.

---

## 5. The multi-layer architecture

### 5.1 The four layers

```
┌──────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (UI tier)                                    │
│                                                                  │
│  public/            browser: HTML, CSS, ES modules               │
│    js/views/          one module per screen, render() only       │
│    js/app.js          router + delegated events                  │
│    js/api/client.js   the only place fetch() appears             │
│    js/state/store.js  session + in-memory guest state            │
│    js/ui/components.js shared markup, HTML escaping              │
│                                                                  │
│  src/presentation/  server: the HTTP boundary                    │
│    routes/            URL → controller, with access guards       │
│    controllers/       read request, call ONE service, respond    │
│    middleware/        sessions, guards, error → status code      │
└───────────────────────────┬──────────────────────────────────────┘
                            │  plain objects, never SQL rows
┌───────────────────────────▼──────────────────────────────────────┐
│  APPLICATION LOGIC LAYER (middle tier)                           │
│                                                                  │
│  src/application/services/    workflows and policy               │
│    AuthService            registration, sign-in, sessions        │
│    TriageService          symptom check + the guest privacy rule │
│    AppointmentService     booking, conflicts, "patients only"    │
│    EscalationService      the four-effect escalation transaction │
│    NotificationService    what to send, to whom, on what channel │
│    ChatbotService         assistant turns and transcript policy  │
│    PatientService         profile, chart, dashboard assembly     │
│    index.js               composition root — wires the graph     │
│                                                                  │
│  src/application/domain/      pure rules, no I/O                 │
│    triageRules.js         the scoring engine + questionnaire     │
│    symptomLexicon.js      clinical vocabulary and routing table  │
│    password.js            hashing policy (scrypt)                │
│  src/application/errors.js    the error vocabulary               │
└───────────────────────────┬──────────────────────────────────────┘
                            │  method calls, never SQL
┌───────────────────────────▼──────────────────────────────────────┐
│  DATA ACCESS LAYER                                               │
│                                                                  │
│  src/dataaccess/repositories/   SQL ↔ objects                    │
│    UserRepository + SessionRepository                            │
│    MedicalRecordRepository + TriageAssessmentRepository          │
│    AppointmentRepository                                         │
│    EscalationRepository + SpecialistRepository                   │
│    NotificationRepository + ChatRepository                       │
│                                                                  │
│  src/dataaccess/gateways/       external APIs (simulated)        │
│    EmailGateway    send({to, subject, body})                     │
│    SmsGateway      send({to, body})                              │
│    AiGateway       complete({text, history, patientContext})     │
└───────────────────────────┬──────────────────────────────────────┘
                            │  db.get / db.all / db.run / db.transaction
┌───────────────────────────▼──────────────────────────────────────┐
│  DATABASE LAYER                                                  │
│                                                                  │
│  src/database/schema.sql      tables, constraints, indexes       │
│  src/database/connection.js   the ONLY file importing a driver   │
│  src/database/seed.js         demo data, via the repositories    │
│  data/medtriage.db            SQLite file, created at runtime    │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 The rule that holds it together

**Dependencies point downward only.**

| Rule | Why it matters |
|---|---|
| A repository never imports a service | Keeps data access reusable and free of policy |
| A service never imports Express | Services are testable without starting a server |
| A service never writes SQL | Storage can change without touching business rules |
| A controller holds no business logic | Read request → call one service → respond |
| Only `connection.js` imports a driver | One file to change for a different database |
| Only `api/client.js` calls `fetch()` | One file to change for a different transport |

These are verifiable, not aspirational:

```bash
grep -rl "from 'express'"   src/application/   # (none)
grep -rl "application/services" src/dataaccess/ # (none)
grep -rlE "SELECT |INSERT INTO" src/application src/presentation  # (none)
grep -rl "node:sqlite" src/      # exactly one: src/database/connection.js
grep -rl "fetch(" public/js/     # exactly one: public/js/api/client.js
```

### 5.3 Why each layer exists

**Presentation** exists so the interface can change freely. The browser half renders and collects
input; the server half translates HTTP into service calls. Neither decides anything clinical. The
worst a tampered browser can do is show the wrong screen — every rule is re-checked server-side.

**Application logic** exists so the rules live in one readable place. `triageRules.js` is the file a
clinical reviewer would read: pure functions over plain data, no database, no HTTP, no DOM. It can be
unit-tested without starting anything.

**Data access** exists so storage details stay contained. Repositories translate rows into plain
objects and strip credential columns on the way out, so a password hash cannot leak upward by
accident. Gateways do the same for external APIs — they make email, SMS and the assistant look like
ordinary method calls.

**Database** exists to own the physical schema. Constraints there are the last line of defence:
`appointments.patient_id` and `escalations.patient_id` are `NOT NULL` foreign keys, so a guest
appointment is not merely forbidden — it is not representable.

### 5.4 Swap points

Each boundary is a place you can replace one implementation with another:

| To change… | Rewrite… | Nothing else changes |
|---|---|---|
| SQLite → PostgreSQL | `src/database/connection.js` | Repositories, services, controllers, UI |
| Simulated → real email | `src/dataaccess/gateways/EmailGateway.js` | `NotificationService` and everything above |
| Rule-based → real LLM | `src/dataaccess/gateways/AiGateway.js` | `ChatbotService` and everything above |
| REST → GraphQL | `public/js/api/client.js` + `src/presentation/` | Services, domain, repositories |
| Vanilla JS → React | `public/js/views/` + `app.js` | The entire server |

Each gateway already throws a clear error in `live` mode, marking exactly where to implement:

```js
if (this.mode === 'live') {
  throw new Error('EmailGateway: live mode requires a configured provider adapter.');
}
```

Set `NOTIFY_MODE=live` or `AI_MODE=live` once a real adapter exists.

### 5.5 Defence in depth

Important rules are enforced at **three** layers on purpose, because each guards against a different
failure:

| Layer | Mechanism | Guards against |
|---|---|---|
| Presentation | route guards + hidden UI | Wasted work, confusing screens |
| Application | `requirePatient()`, `requireClinician()` | A new controller forgetting a guard |
| Database | `NOT NULL` foreign keys, `CHECK` constraints | A bug in a service writing bad data |

Observe the layering in the actual responses:

```
guest   → GET /api/appointments  401  "This feature needs a free account…"
patient → GET /api/cases         403  "Only a doctor or administrator can do that."
doctor  → GET /api/appointments  403  "Only patient accounts can use this."
```

---

## 6. Tracing one request through all four layers

Booking an appointment, end to end.

**1 · Presentation (browser)** — `public/js/views/appointments.js` renders the form. A submit is
caught by the delegated listener in `app.js`, which gathers the fields and calls the API client. No
URL and no verb appear in the view.

```js
// public/js/app.js
async 'book-appointment'(data, form) {
  const option = form.querySelector('[name="clinician"] option:checked');
  await api.appointments.book({ ...data, specialty: option?.dataset.specialty });
  setFlash('Appointment booked. A confirmation is in your outbox.', 'ok');
  refresh();
}
```

**2 · Presentation (API)** — the route applies the guard, the controller does nothing but translate.

```js
// src/presentation/routes/index.js
router.post('/appointments', requirePatient, a(appointmentController.book));

// src/presentation/controllers/appointmentController.js
async book(req, res) {
  const appointment = await services.appointments.book(req.user, req.body ?? {});
  res.status(201).json({ appointment });
}
```

**3 · Application logic** — every decision happens here.

```js
// src/application/services/AppointmentService.js
async book(user, { clinician, specialty, scheduledAt, reason }) {
  AppointmentService.requirePatient(user);            // policy
  /* …validation, collecting all problems… */
  if (this.appointments.findConflict(clinician, slot))  // business rule
    throw ConflictError(`${clinician} is already booked at that time…`);
  const appointment = this.appointments.create({ … });  // data access
  await this.notifications.sendAppointmentConfirmation(user, appointment);
  return appointment;
}
```

**4 · Data access** — SQL lives here and nowhere above.

```js
// src/dataaccess/repositories/AppointmentRepository.js
create({ patientId, clinician, specialty, scheduledAt, reason, priority }) {
  const { lastInsertRowid } = db.run(
    `INSERT INTO appointments
       (patient_id, clinician, specialty, scheduled_at, reason, priority)
     VALUES (?,?,?,?,?,?)`,
    patientId, clinician, specialty, scheduledAt, reason, priority);
  return this.findById(lastInsertRowid);
}
```

**5 · Database** — the driver wrapper, the only place `node:sqlite` is imported.

```js
// src/database/connection.js
run(sql, ...params) {
  const result = open().prepare(sql).run(...params);
  return { changes: Number(result.changes),
           lastInsertRowid: Number(result.lastInsertRowid) };
}
```

**On the way back up**, an error thrown by the service as `ConflictError` is translated to HTTP by a
single piece of middleware, and the API client turns it back into a typed `ApiError` the view can
render. No layer in between knows about status codes.

```js
// src/presentation/middleware/errorHandler.js
if (error instanceof AppError) {
  return res.status(error.status).json({
    error: { code: error.code, message: error.message, details: error.details } });
}
```

---

## 7. Data model

Nine tables. `schema.sql` is the authoritative source.

| Table | Purpose | Notable constraints |
|---|---|---|
| `users` | Every authenticated actor | `role` CHECK in (patient, doctor, admin); `email` UNIQUE |
| `sessions` | Opaque bearer tokens | Cascades on user delete; expiry swept on boot |
| `medical_records` | The longitudinal chart | `category` CHECK in (visit, lab, medication, triage, note) |
| `triage_assessments` | Stored symptom checks | `level` CHECK; **registered patients only** |
| `specialists` | Assignment pool | `active_cases` drives least-loaded routing |
| `appointments` | Bookings, standard and priority | `patient_id` **NOT NULL** — no guest appointments |
| `escalations` | Cases flagged for special treatment | `case_ref` UNIQUE; one escalation per assessment |
| `notifications` | The simulated outbox / audit trail | `channel` CHECK in (email, sms) |
| `chat_messages` | Assistant transcript | Signed-in users only |

**Guests appear nowhere in this schema.** That is the design, not an omission. There is no guest
table, no nullable guest column, no anonymous placeholder row. A guest session exists only in browser
memory and in the request/response cycle.

### Relationships

```
users ─┬─< sessions
       ├─< medical_records
       ├─< triage_assessments ─< escalations >─ specialists
       ├─< appointments <───────┘ (priority appointment)
       ├─< notifications
       └─< chat_messages
```

---

## 8. API reference

All endpoints are under `/api` and speak JSON. Authentication is a session cookie.

### Open to guests

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/auth/me` | Who am I? Returns `{ user, role }`, role `guest` when signed out |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/signin` | Sign in |
| `POST` | `/api/auth/signout` | Sign out |
| `GET` | `/api/triage/questionnaire` | The questions (option labels only; weights stay server-side) |
| `POST` | `/api/triage/submit` | Run a symptom check |
| `POST` | `/api/chat/send` | One assistant turn |

### Registered patients only

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/patient/dashboard` | Everything the dashboard needs, in one round trip |
| `GET` / `PUT` | `/api/patient/profile` | Read / update personal information |
| `PUT` | `/api/patient/reminders` | Update reminder channels |
| `GET` / `POST` | `/api/patient/records` | List / add chart entries |
| `DELETE` | `/api/patient/records/:id` | Delete a chart entry |
| `GET` | `/api/patient/notifications` | The outbox |
| `GET` | `/api/patient/escalations` | My escalated cases |
| `GET` | `/api/triage/history` | My symptom check history |
| `GET` / `POST` | `/api/appointments` | List / book |
| `DELETE` | `/api/appointments/:id` | Cancel |
| `POST` | `/api/appointments/:id/remind` | Re-send a reminder |
| `GET` / `DELETE` | `/api/chat/history` | Read / clear transcript |

### Doctors and administrators only

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/cases` | Open case queue, worst-first |
| `GET` | `/api/escalations` | All escalated cases |
| `POST` | `/api/escalations` | Escalate — triggers all four effects |
| `PUT` | `/api/escalations/:id` | Change case status |
| `GET` | `/api/specialists` | Specialist availability |

### Error format

Every failure returns the same shape, so the UI renders all of them identically:

```json
{ "error": {
    "code": "validation_failed",
    "message": "Please fix the highlighted fields.",
    "details": ["Password must be at least 8 characters, include a number."] } }
```

| Status | Code | Meaning |
|---|---|---|
| 401 | `unauthenticated` | Not signed in, or the session expired |
| 403 | `forbidden` | Signed in, but the wrong role |
| 404 | `not_found` | No such record |
| 409 | `conflict` | Duplicate email, double booking, already escalated |
| 422 | `validation_failed` | Field problems, listed in `details` |
| 500 | `server_error` | Unexpected — details stay on the server |

### Trying the API directly

```bash
# Guest symptom check with emergency answers
curl -s -X POST localhost:3000/api/triage/submit \
  -H 'content-type: application/json' \
  -d '{"answers":[1,1,0,1]}'

# Sign in as the doctor, then escalate assessment 1
curl -s -c /tmp/doc.txt -X POST localhost:3000/api/auth/signin \
  -H 'content-type: application/json' \
  -d '{"email":"doctor@medtriage.test","password":"Doctor123"}'

curl -s -b /tmp/doc.txt -X POST localhost:3000/api/escalations \
  -H 'content-type: application/json' \
  -d '{"assessmentId":1,"notes":"Orthostatic pattern."}'
```

---

## 9. Design decisions and trade-offs

**Guest data is not stored, rather than stored and deleted.** A deletion job can fail, be forgotten,
or be disabled. No write cannot. The cost is that a guest cannot resume a session or recover a
result — which is the correct trade for a promise this explicit.

**Escalation applies only to registered patients.** The original brief asked to notify "the patient
or guest," but also that guest data never be stored and that escalation be restricted to registered
patients. Those cannot all hold: there is no stored case and no contact details for a guest. The
later, more specific constraint wins, and the database makes it structural — `escalations.patient_id`
is `NOT NULL`.

**The notification is outside the escalation transaction.** Explained in §4.5. A recorded clinical
decision must survive a mail provider outage.

**Assistant signals can only raise urgency.** Free text is noisy, and the asymmetric cost of error
argues for one direction only.

**Integrations are simulated, but behind real interfaces.** The gateways are adapters with proper
contracts, not UI stubs. Going live means implementing one method in one file.

**Validation collects every problem.** Services gather all failures into `details` rather than
throwing on the first, so a user fixes a form once instead of five times.

**No front-end framework.** The course brief is HTML, CSS and JavaScript. The browser presentation
layer is organised into modules with the same discipline as the server, which demonstrates that the
architecture — not the tooling — is what provides the separation.

### Security notes

- Passwords hashed with **scrypt** (`node:crypto`) and a per-user 16-byte random salt.
- Credential columns are stripped inside `UserRepository`, so they cannot leak upward by accident.
- Sign-in runs a hash comparison even when the account does not exist, so a missing account and a
  wrong password take the same time.
- Sessions are opaque 32-byte tokens in an `httpOnly`, `sameSite=lax` cookie with a server-side
  expiry swept on boot.
- All interpolated values pass through `esc()` before meeting `innerHTML`.
- Service-layer validation runs on every write, independently of anything the browser checked.

---

## 10. Troubleshooting

**`node:sqlite` is not available / unexpected import error**
Your Node is older than 22.5. Check with `node --version` and upgrade.

**Port 3000 is already in use**
Run on another port: `PORT=4000 npm start`.

**The database is in a strange state after testing**
`npm run reset` deletes `data/medtriage.db` and re-seeds from scratch.

**No demo data appears**
Seeding only runs when the `users` table is empty, so it is safe to restart. If you have an empty
database with a stray row, run `npm run reset`.

**Email or SMS never arrives**
That is correct. Delivery is simulated. Every message is recorded in the `notifications` table and
shown in Profile → Notification outbox, and echoed to the server console as
`[email:simulated] …`.

**I am signed in but a page redirects me away**
That is the role guard. A doctor cannot open the patient dashboard, and a patient cannot open the
case queue. Sign in with an account of the right type.

**Changes to a file do not appear**
`npm start` does not watch. Use `npm run dev`, and hard-refresh the browser (⌘⇧R / Ctrl+Shift+R) to
clear cached ES modules.

---

## Project layout

```
server.js                      bootstrap: Express, static files, API, shutdown
package.json
README.md                      quick start + architecture summary
DOCUMENTATION.md               this document

public/                        PRESENTATION LAYER (browser)
  index.html
  css/style.css
  js/app.js                    router, delegated events, view lifecycle
  js/api/client.js             the single HTTP boundary
  js/state/store.js            session + in-memory guest state
  js/ui/components.js          shared markup helpers, escaping
  js/views/                    landing, auth, check, dashboard, appointments,
                               records, profile, assistant, clinical

src/
  config/index.js              configuration, read once
  presentation/                PRESENTATION LAYER (API)
    routes/index.js            the whole access policy on one screen
    controllers/               one per resource
    middleware/                session, guards, error handler
  application/                 APPLICATION LOGIC LAYER
    services/                  seven services + composition root
    domain/                    triage rules, lexicon, password policy
    errors.js                  the error vocabulary services speak
  dataaccess/                  DATA ACCESS LAYER
    repositories/              SQL ↔ objects
    gateways/                  email, SMS, AI adapters
  database/                    DATABASE LAYER
    schema.sql, connection.js, seed.js

data/medtriage.db              created at runtime, git-ignored
```
