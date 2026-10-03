// ============================================================================
// APPLICATION LOGIC LAYER - registration, sign-in, sessions, roles.
// Depends on repositories (data access), never on Express.
// ============================================================================
import { randomBytes } from 'node:crypto';
import { userRepository, sessionRepository } from '../../dataaccess/repositories/UserRepository.js';
import { hashPassword, verifyPassword, describePasswordProblems } from '../domain/password.js';
import { ValidationError, AuthError, ConflictError } from '../errors.js';
import config from '../../config/index.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthService {
  constructor({ users = userRepository, sessions = sessionRepository, notifications = null } = {}) {
    this.users = users;
    this.sessions = sessions;
    this.notifications = notifications; // injected later to avoid a cycle
  }

  async register(input) {
    const problems = [];
    const email = String(input.email ?? '').trim().toLowerCase();
    const firstName = String(input.firstName ?? '').trim();
    const lastName = String(input.lastName ?? '').trim();

    if (!firstName) problems.push('First name is required.');
    if (!lastName) problems.push('Last name is required.');
    if (!EMAIL_RE.test(email)) problems.push('Enter a valid email address.');

    const pwProblems = describePasswordProblems(input.password);
    if (pwProblems.length) problems.push(`Password must ${pwProblems.join(', ')}.`);
    if (input.password !== input.confirmPassword) problems.push('Passwords do not match.');
    if (!input.acceptedTerms) problems.push('You must accept the terms and privacy notice.');

    const role = ['patient', 'doctor', 'admin'].includes(input.role) ? input.role : 'patient';
    if (role === 'doctor' && !String(input.specialty ?? '').trim()) {
      problems.push('Clinician accounts need a specialty.');
    }
    if (problems.length) throw ValidationError('Please fix the highlighted fields.', problems);

    if (this.users.emailExists(email)) {
      throw ConflictError('An account already exists for that email address.');
    }

    const { hash, salt } = hashPassword(input.password);
    const user = this.users.create({
      role,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      firstName,
      lastName,
      phone: String(input.phone ?? '').trim() || null,
      dateOfBirth: input.dateOfBirth || null,
      coverageType: input.coverageType || null,
      specialty: role === 'doctor' ? String(input.specialty).trim() : null,
      reminderEmail: input.reminderEmail !== false,
      reminderSms: Boolean(input.reminderSms)
    });

    if (this.notifications) await this.notifications.sendWelcome(user);
    return { user, session: this.#issueSession(user.id) };
  }

  async signIn({ email, password }) {
    const credentials = this.users.findCredentialsByEmail(email ?? '');
    // Always run a hash comparison so a missing account and a wrong password
    // take the same amount of time.
    const ok = credentials
      ? verifyPassword(password ?? '', credentials.hash, credentials.salt)
      : verifyPassword(password ?? '', hashPassword('decoy').hash, 'decoy-salt');

    if (!credentials || !ok) throw AuthError();

    const user = this.users.findById(credentials.id);
    return { user, session: this.#issueSession(user.id) };
  }

  signOut(token) {
    if (token) this.sessions.delete(token);
  }

  /** Resolve a cookie token to a user, or null for a guest. */
  currentUser(token) {
    return this.sessions.findUserByToken(token);
  }

  #issueSession(userId) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + config.session.ttlMinutes * 60_000)
      .toISOString().replace('T', ' ').slice(0, 19);
    this.sessions.create(token, userId, expiresAt);
    return { token, expiresAt, maxAgeMs: config.session.ttlMinutes * 60_000 };
  }
}

export const authService = new AuthService();
