-- ============================================================================
-- DATABASE LAYER - physical storage definition for MedTriage AI
-- Nothing above the Data Access Layer is allowed to know this file exists.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------------------
-- users: every authenticated actor. role drives all authorization decisions.
-- Guests are deliberately absent: a guest has no row anywhere in this schema.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  role            TEXT    NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  email           TEXT    NOT NULL UNIQUE,
  password_hash   TEXT    NOT NULL,
  password_salt   TEXT    NOT NULL,
  first_name      TEXT    NOT NULL,
  last_name       TEXT    NOT NULL,
  phone           TEXT,
  date_of_birth   TEXT,
  coverage_type   TEXT,
  specialty       TEXT,                 -- doctors only
  reminder_email  INTEGER NOT NULL DEFAULT 1,
  reminder_sms    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- --------------------------------------------------------------------------
-- sessions: opaque bearer tokens. Deleted on sign-out and on expiry sweep.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- --------------------------------------------------------------------------
-- medical_records: the longitudinal chart. Registered patients only.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    TEXT    NOT NULL CHECK (category IN ('visit','lab','medication','triage','note')),
  title       TEXT    NOT NULL,
  detail      TEXT,
  recorded_at TEXT    NOT NULL DEFAULT (datetime('now')),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_records_patient ON medical_records(patient_id, recorded_at DESC);

-- --------------------------------------------------------------------------
-- triage_assessments: a completed symptom check.
-- Written ONLY for signed-in patients. A guest assessment is computed in
-- memory, returned in the HTTP response, and never reaches this table.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS triage_assessments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers      TEXT    NOT NULL,       -- JSON array of selected option indexes
  free_text    TEXT,                   -- optional chatbot-sourced description
  level        TEXT    NOT NULL CHECK (level IN ('emergency','same_day','routine')),
  headline     TEXT    NOT NULL,
  rationale    TEXT    NOT NULL,       -- JSON array of strings
  escalated    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_triage_patient ON triage_assessments(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_level ON triage_assessments(level, escalated);

-- --------------------------------------------------------------------------
-- specialists: assignment pool used when a case is escalated.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS specialists (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  specialty    TEXT    NOT NULL,
  active       INTEGER NOT NULL DEFAULT 1,
  active_cases INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_specialists_specialty ON specialists(specialty, active);

-- --------------------------------------------------------------------------
-- appointments: standard bookings and auto-created priority bookings.
-- Registered patients only - enforced by the NOT NULL foreign key.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinician     TEXT    NOT NULL,
  specialty     TEXT    NOT NULL,
  scheduled_at  TEXT    NOT NULL,
  reason        TEXT,
  priority      TEXT    NOT NULL DEFAULT 'standard' CHECK (priority IN ('standard','priority')),
  status        TEXT    NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id, scheduled_at);

-- --------------------------------------------------------------------------
-- escalations: a case flagged for special treatment by a doctor or admin.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS escalations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  case_ref       TEXT    NOT NULL UNIQUE,
  assessment_id  INTEGER NOT NULL REFERENCES triage_assessments(id) ON DELETE CASCADE,
  patient_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raised_by      INTEGER NOT NULL REFERENCES users(id),
  specialist_id  INTEGER REFERENCES specialists(id),
  appointment_id INTEGER REFERENCES appointments(id),
  status         TEXT    NOT NULL DEFAULT 'special_treatment'
                   CHECK (status IN ('special_treatment','in_review','resolved')),
  priority       TEXT    NOT NULL DEFAULT 'high' CHECK (priority IN ('high','urgent')),
  notes          TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_esc_patient ON escalations(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_esc_assessment ON escalations(assessment_id);

-- --------------------------------------------------------------------------
-- notifications: the simulated outbox. Every email/SMS the platform "sent".
-- Doubles as the audit trail for reminders and escalation notices.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  channel      TEXT    NOT NULL CHECK (channel IN ('email','sms')),
  recipient    TEXT    NOT NULL,
  subject      TEXT,
  body         TEXT    NOT NULL,
  category     TEXT    NOT NULL,       -- reminder | escalation | welcome
  related_type TEXT,
  related_id   INTEGER,
  status       TEXT    NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','queued')),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);

-- --------------------------------------------------------------------------
-- chat_messages: assistant transcript. Persisted for signed-in users only;
-- guest conversations live in browser memory and die with the session.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author     TEXT    NOT NULL CHECK (author IN ('user','assistant')),
  text       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, id);
