// ============================================================================
// APPLICATION LOGIC LAYER - password hashing policy.
// scrypt from node:crypto, so there is no native dependency to compile.
// ============================================================================
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import config from '../../config/index.js';

const { keylen, cost, blockSize, parallelization } = config.security.scrypt;
const opts = { N: cost, r: blockSize, p: parallelization, maxmem: 64 * 1024 * 1024 };

export function hashPassword(plain, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(plain, salt, keylen, opts).toString('hex');
  return { hash, salt };
}

export function verifyPassword(plain, hash, salt) {
  const candidate = scryptSync(plain, salt, keylen, opts);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/** Minimum policy enforced at registration. */
export function describePasswordProblems(plain) {
  const problems = [];
  if (!plain || plain.length < 8) problems.push('be at least 8 characters');
  if (!/[a-zA-Z]/.test(plain ?? '')) problems.push('include a letter');
  if (!/\d/.test(plain ?? '')) problems.push('include a number');
  return problems;
}
