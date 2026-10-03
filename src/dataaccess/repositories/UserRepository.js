// ============================================================================
// DATA ACCESS LAYER - users and authentication sessions.
// Translates between SQL rows and the plain objects the services consume.
// Knows SQL; knows nothing about HTTP, business rules or the UI.
// ============================================================================
import db from '../../database/connection.js';

/** Strip credential columns so they never escape this layer by accident. */
function toUser(row) {
  if (!row) return null;
  const { password_hash, password_salt, ...safe } = row;
  return {
    ...safe,
    reminder_email: Boolean(safe.reminder_email),
    reminder_sms: Boolean(safe.reminder_sms)
  };
}

export class UserRepository {
  create({ role, email, passwordHash, passwordSalt, firstName, lastName,
           phone = null, dateOfBirth = null, coverageType = null,
           specialty = null, reminderEmail = true, reminderSms = false }) {
    const { lastInsertRowid } = db.run(
      `INSERT INTO users
         (role, email, password_hash, password_salt, first_name, last_name,
          phone, date_of_birth, coverage_type, specialty, reminder_email, reminder_sms)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      role, email.toLowerCase(), passwordHash, passwordSalt, firstName, lastName,
      phone, dateOfBirth, coverageType, specialty,
      reminderEmail ? 1 : 0, reminderSms ? 1 : 0
    );
    return this.findById(lastInsertRowid);
  }

  findById(id) {
    return toUser(db.get('SELECT * FROM users WHERE id = ?', id));
  }

  findByEmail(email) {
    return toUser(db.get('SELECT * FROM users WHERE email = ?', String(email).toLowerCase()));
  }

  /** Credentials stay inside the data access layer; only AuthService asks for them. */
  findCredentialsByEmail(email) {
    const row = db.get(
      'SELECT id, password_hash, password_salt FROM users WHERE email = ?',
      String(email).toLowerCase()
    );
    return row ? { id: row.id, hash: row.password_hash, salt: row.password_salt } : null;
  }

  emailExists(email) {
    return Boolean(db.get('SELECT 1 FROM users WHERE email = ?', String(email).toLowerCase()));
  }

  listByRole(role) {
    return db.all('SELECT * FROM users WHERE role = ? ORDER BY last_name', role).map(toUser);
  }

  updateProfile(id, { firstName, lastName, phone, dateOfBirth, coverageType }) {
    db.run(
      `UPDATE users SET first_name = ?, last_name = ?, phone = ?,
              date_of_birth = ?, coverage_type = ? WHERE id = ?`,
      firstName, lastName, phone, dateOfBirth, coverageType, id
    );
    return this.findById(id);
  }

  updateReminderPreferences(id, { reminderEmail, reminderSms }) {
    db.run('UPDATE users SET reminder_email = ?, reminder_sms = ? WHERE id = ?',
      reminderEmail ? 1 : 0, reminderSms ? 1 : 0, id);
    return this.findById(id);
  }
}

export class SessionRepository {
  create(token, userId, expiresAt) {
    db.run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)',
      token, userId, expiresAt);
    return token;
  }

  /** Returns the owning user, or null when the token is unknown or expired. */
  findUserByToken(token) {
    if (!token) return null;
    const row = db.get(
      `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > datetime('now')`,
      token
    );
    return toUser(row);
  }

  delete(token) {
    db.run('DELETE FROM sessions WHERE token = ?', token);
  }

  purgeExpired() {
    return db.run("DELETE FROM sessions WHERE expires_at <= datetime('now')").changes;
  }
}

export const userRepository = new UserRepository();
export const sessionRepository = new SessionRepository();
