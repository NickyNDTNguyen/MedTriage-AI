// Cross-cutting configuration. Read once, injected downward into the layers.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const config = {
  root,
  port: Number(process.env.PORT ?? 3000),
  database: {
    file: process.env.DB_FILE ?? path.join(root, 'data', 'medtriage.db'),
    schema: path.join(root, 'src', 'database', 'schema.sql')
  },
  session: {
    cookieName: 'medtriage_sid',
    ttlMinutes: Number(process.env.SESSION_TTL_MIN ?? 60 * 12)
  },
  security: {
    // scrypt parameters for password hashing (node:crypto, no native deps)
    scrypt: { keylen: 64, cost: 16384, blockSize: 8, parallelization: 1 }
  },
  notifications: {
    // Simulated delivery. Swap `mode` to 'live' once real provider adapters exist.
    mode: process.env.NOTIFY_MODE ?? 'simulated',
    fromEmail: 'care@medtriage.example',
    fromSms: '+1-555-0142'
  },
  ai: {
    mode: process.env.AI_MODE ?? 'simulated'
  }
};

export default config;
