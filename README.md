# MedTriage AI

A healthcare triage web application built on a **four-layer architecture**.

📖 **[DOCUMENTATION.md](DOCUMENTATION.md)** is the complete guide — how to use the app, every
feature, step-by-step workflow diagrams, the architecture in depth, the data model, the full API
reference, and troubleshooting. This README is the quick start.

> **Academic project.** MedTriage AI is fictional. It is not a medical device, is not connected to
> any government or insurance system, and never produces a diagnosis — only urgency guidance.

---

## Running it

```bash
npm install
npm start
```

Then open **http://localhost:3000**. The database is created and seeded automatically on first run.

| Command | What it does |
|---|---|
| `npm start` | Run the server on port 3000 (`PORT=4000 npm start` to change it) |
| `npm run dev` | Same, with auto-restart on file changes |
| `npm run reset` | Delete the database and re-seed from scratch |

**Requirements:** Node.js 22.5 or newer. The project uses the built-in `node:sqlite` driver, so
there is no native module to compile — Express is the only dependency.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Patient | `patient@medtriage.test` | `Patient123` |
| Patient | `james@medtriage.test` | `Patient123` |
| Doctor | `doctor@medtriage.test` | `Doctor123` |
| Admin | `admin@medtriage.test` | `Admin1234` |

You can also use the symptom checker and the assistant **without signing in at all**.

---

## The four layers

```
┌──────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (UI tier)                                    │
│                                                                  │
│  public/            browser: HTML, CSS, ES modules               │
│    js/views/          one module per screen, render() only       │
│    js/app.js          router + event delegation                  │
│    js/api/client.js   the only place fetch() appears             │
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
│                                                                  │
│  src/application/domain/      pure rules, no I/O                 │
│    triageRules.js         the scoring engine                     │
│    symptomLexicon.js      clinical vocabulary and routing        │
│    password.js            hashing policy (scrypt)                │
└───────────────────────────┬──────────────────────────────────────┘
                            │  method calls, never SQL
┌───────────────────────────▼──────────────────────────────────────┐
│  DATA ACCESS LAYER                                               │
│                                                                  │
│  src/dataaccess/repositories/   SQL ↔ objects                    │
│    UserRepository, MedicalRecordRepository,                      │
│    AppointmentRepository, EscalationRepository,                  │
│    NotificationRepository                                        │
│                                                                  │
│  src/dataaccess/gateways/       external APIs (simulated)        │
│    EmailGateway, SmsGateway, AiGateway                           │
└───────────────────────────┬──────────────────────────────────────┘
                            │  db.get / db.all / db.run
┌───────────────────────────▼──────────────────────────────────────┐
│  DATABASE LAYER                                                  │
│                                                                  │
│  src/database/schema.sql      tables, constraints, indexes       │
│  src/database/connection.js   the ONLY file importing a driver   │
│  src/database/seed.js         demo data, via the repositories    │
└──────────────────────────────────────────────────────────────────┘
```

### The rule that holds it together

**Dependencies point downward only.**

- A repository never imports a service.
- A service never imports Express, and never writes SQL.
- A controller never contains a business rule — it reads the request, calls one service, responds.
- Only `src/database/connection.js` imports a database driver.
- Only `public/js/api/client.js` calls `fetch()`.

Each of these is a swap point. Replacing SQLite with PostgreSQL means rewriting `connection.js`.
Replacing the simulated email provider with SendGrid means rewriting `EmailGateway.js`. Neither
touches a service, a controller, or a single line of UI.

---

## How the main requirements are implemented

### Guest diagnosis leaves no trace

The rule lives in exactly one place — `TriageService.submit()`:

```js
// ---- guest branch: nothing is written, nothing is returned by id -------
if (!user || user.role !== 'patient') {
  return { ...result, id: null, stored: false, privacyNote: '...' };
}
// ---- registered patient branch: persist to the chart ------------------
```

There is no code path from a guest submission to the database. The same holds for the assistant:
`ChatbotService` only reaches `ChatRepository` when a user is present, and a guest's transcript is
carried in browser memory (`store.js → guest.messages`) and posted back with each turn.

You can verify this. Run a full guest symptom check and a guest conversation, then:

```bash
node --disable-warning=ExperimentalWarning -e "import('./src/database/connection.js').then(({default:db})=>{for(const t of ['triage_assessments','chat_messages','notifications'])console.log(t,db.get('SELECT COUNT(*) n FROM '+t).n);db.close()})"
```

The counts do not move.

### Appointments and escalation are registered-patients-only

Enforced at three levels, deliberately:

1. **Database** — `appointments.patient_id` and `escalations.patient_id` are `NOT NULL` foreign keys
   to `users`. A guest row is not representable.
2. **Application logic** — `AppointmentService.requirePatient()` and
   `EscalationService.requireClinician()` throw before any work happens.
3. **Presentation** — the route guards in `src/presentation/middleware/guards.js` reject the request
   at the HTTP boundary, and the browser router hides the screens.

The UI layer is a convenience. The API refuses regardless:

```
guest   → GET /api/appointments   401  "This feature needs a free account…"
patient → GET /api/cases          403  "Only a doctor or administrator can do that."
doctor  → GET /api/appointments   403  "Only patient accounts can use this."
```

### Escalation does four things atomically

`EscalationService.escalate()` is the most interesting method in the project.

| # | Effect | Where |
|---|---|---|
| 1 | Case flagged with special treatment status | `escalations` row, `status = 'special_treatment'` |
| 2 | Specialist assigned | least-loaded active clinician in the routed specialty |
| 3 | Patient notified | `NotificationService` → email + SMS gateways |
| 4 | Priority appointment created | next morning 08:00, `priority = 'priority'` |

Effects 1, 2 and 4 are database writes and run inside **one transaction** — if any fails, none of
them happened. Effect 3 runs **after the commit** on purpose: a mail provider outage must not roll
back a clinical decision that has already been recorded.

The specialty is routed from the symptoms via `CATEGORY_TO_SPECIALTY` — a dizziness case lands with
Neurology, a chest-pain case with Cardiology — unless the clinician overrides it in the form.

### The assistant feeds the triage engine

When someone describes a symptom that the fixed options do not cover, `AiGateway` extracts
structured signals (matched symptoms, red-flag phrases, duration) alongside the human reply. The
browser carries those signals into the next symptom check, and `triageRules.assess()` folds them in.

Signals can only ever **raise** urgency, never lower it. A free-text red flag forces an emergency
result regardless of what was clicked.

---

## Simulated integrations

Email, SMS and the assistant are simulated. They are not stubs bolted onto the UI — they are real
adapters behind real interfaces, in the data access layer, selected by configuration:

```js
// src/config/index.js
notifications: { mode: process.env.NOTIFY_MODE ?? 'simulated' },
ai:            { mode: process.env.AI_MODE     ?? 'simulated' }
```

Every simulated send is written to the `notifications` table and shown in the patient's
**Notification outbox** (Profile page), so you can see exactly what the platform would have
delivered, to which address, on which channel.

### Going live

Each gateway already throws a clear error in `live` mode, marking the single place to implement:

```js
if (this.mode === 'live') {
  throw new Error('EmailGateway: live mode requires a configured provider adapter.');
}
```

To use a real provider, implement `send()` for that branch and set `NOTIFY_MODE=live`. Nothing above
the gateway changes — `NotificationService` already treats delivery as an interface returning
`{ status, providerId, channel }`.

The same applies to `AiGateway.complete()`, which returns `{ reply, signals, usedContext }`. A real
model call would return the same shape, and `ChatbotService` would not know the difference.

---

## Security notes

- Passwords are hashed with **scrypt** (`node:crypto`) using a per-user random salt. Credential
  columns are stripped inside `UserRepository` so they cannot leak upward by accident.
- Sign-in runs a hash comparison even when the account does not exist, so a missing account and a
  wrong password take the same time.
- Sessions are opaque 32-byte tokens in an `httpOnly`, `sameSite=lax` cookie, with a server-side
  expiry swept on boot.
- All interpolated values pass through `esc()` before meeting `innerHTML`.
- Service-layer validation runs on every write, independently of anything the browser checked.

---

## Project layout

```
server.js                      bootstrap: Express, static files, API, shutdown
package.json
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

## API reference

| Access | Endpoints |
|---|---|
| **Open to guests** | `GET /api/triage/questionnaire`, `POST /api/triage/submit`, `POST /api/chat/send`, `GET /api/auth/me`, `POST /api/auth/{register,signin,signout}` |
| **Registered patients** | `GET/POST/DELETE /api/appointments`, `POST /api/appointments/:id/remind`, `GET /api/patient/{dashboard,profile,records,notifications,escalations}`, `PUT /api/patient/{profile,reminders}`, `GET /api/triage/history` |
| **Doctors and admins** | `GET /api/cases`, `GET/POST /api/escalations`, `PUT /api/escalations/:id`, `GET /api/specialists` |
