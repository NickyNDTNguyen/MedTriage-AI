// ============================================================================
// DATABASE LAYER - demo data.
//
// Seeding goes through the DATA ACCESS LAYER rather than raw SQL, so the seed
// exercises the same code path the running application uses.
// Idempotent: safe to run repeatedly, does nothing once users exist.
// ============================================================================
import db from './connection.js';
import { userRepository } from '../dataaccess/repositories/UserRepository.js';
import { medicalRecordRepository, triageAssessmentRepository }
  from '../dataaccess/repositories/MedicalRecordRepository.js';
import { appointmentRepository } from '../dataaccess/repositories/AppointmentRepository.js';
import { hashPassword } from '../application/domain/password.js';
import { assess } from '../application/domain/triageRules.js';

const SPECIALISTS = [
  ['Dr. Noah Feld',      'Cardiology'],
  ['Dr. Hana Berg',      'Cardiology'],
  ['Dr. Priya Raman',    'Neurology'],
  ['Dr. Luis Ortega',    'Pulmonology'],
  ['Dr. Amara Rivera',   'Internal Medicine'],
  ['Dr. Grace Osei',     'Behavioral Health'],
  ['Dr. Tomas Linde',    'Gastroenterology'],
  ['Dr. Iris Chen',      'Allergy & Immunology'],
  ['Dr. Sam Whitfield',  'Emergency Medicine']
];

function makeUser({ email, password, role, firstName, lastName, ...rest }) {
  const { hash, salt } = hashPassword(password);
  return userRepository.create({
    role, email, passwordHash: hash, passwordSalt: salt, firstName, lastName, ...rest
  });
}

function daysFromNow(days, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(hour)}:00:00`;
}

export function ensureSeeded() {
  const existing = db.get('SELECT COUNT(*) AS n FROM users');
  if (existing && existing.n > 0) return false;

  console.log('  seeding demo data...');

  for (const [name, specialty] of SPECIALISTS) {
    db.run('INSERT INTO specialists (name, specialty) VALUES (?,?)', name, specialty);
  }

  // ---- patient ------------------------------------------------------------
  const patient = makeUser({
    email: 'patient@medtriage.test', password: 'Patient123', role: 'patient',
    firstName: 'Maria', lastName: 'Alvarez',
    phone: '+1-555-0101', dateOfBirth: '1958-04-12',
    coverageType: 'Original Medicare', reminderEmail: true, reminderSms: true
  });

  makeUser({
    email: 'james@medtriage.test', password: 'Patient123', role: 'patient',
    firstName: 'James', lastName: 'Okafor',
    phone: '+1-555-0133', dateOfBirth: '1971-11-02',
    coverageType: 'Medicare Advantage', reminderEmail: true, reminderSms: false
  });

  // ---- clinical staff -----------------------------------------------------
  makeUser({
    email: 'doctor@medtriage.test', password: 'Doctor123', role: 'doctor',
    firstName: 'Noah', lastName: 'Feld', specialty: 'Cardiology', phone: '+1-555-0120'
  });

  makeUser({
    email: 'admin@medtriage.test', password: 'Admin1234', role: 'admin',
    firstName: 'Dana', lastName: 'Reyes', phone: '+1-555-0199'
  });

  // ---- Maria's chart ------------------------------------------------------
  const chart = [
    ['visit',      'Primary care visit',      'Routine follow-up. Blood pressure 138/84.', daysFromNow(-31)],
    ['lab',        'Comprehensive blood panel', 'Within normal limits except low vitamin D.', daysFromNow(-50)],
    ['medication', 'Lisinopril 10 mg daily',  'Started for blood pressure management.',      daysFromNow(-80)],
    ['medication', 'Vitamin D 1000 IU daily', 'Supplement following lab result.',            daysFromNow(-49)]
  ];
  for (const [category, title, detail, recordedAt] of chart) {
    medicalRecordRepository.add({ patientId: patient.id, category, title, detail, recordedAt });
  }

  appointmentRepository.create({
    patientId: patient.id, clinician: 'Dr. Amara Rivera', specialty: 'Internal Medicine',
    scheduledAt: daysFromNow(6, 10), reason: 'Blood pressure follow-up'
  });

  // An open case so the clinician dashboard has something to escalate on
  // first run. Scored through the real rules engine, not hand-written.
  const answers = [2, 0, 0, 0];               // several days, dizziness, worse on standing, no red flags
  const scored = assess(answers);
  triageAssessmentRepository.save({
    patientId: patient.id,
    answers,
    freeText: 'I get dizzy when I stand up, and it has been going on for about four days.',
    level: scored.level, headline: scored.headline, rationale: scored.rationale
  });

  console.log('  demo data ready.');
  return true;
}

// Allow `npm run seed` to run this file directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureSeeded();
  db.close();
}
