// ============================================================================
// DATABASE LAYER - connection management and the thin driver wrapper.
//
// This is the ONLY module in the codebase that imports a database driver.
// Repositories talk to the `db` object below; swapping node:sqlite for
// better-sqlite3, Postgres or MySQL means rewriting this file and nothing else.
// ============================================================================
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import config from '../config/index.js';

let handle = null;

function open() {
  if (handle) return handle;

  fs.mkdirSync(path.dirname(config.database.file), { recursive: true });
  handle = new DatabaseSync(config.database.file);
  handle.exec('PRAGMA journal_mode = WAL;');
  handle.exec('PRAGMA foreign_keys = ON;');
  handle.exec(fs.readFileSync(config.database.schema, 'utf8'));
  return handle;
}

// node:sqlite returns BigInt for integer columns in some builds and for
// lastInsertRowid always. Normalise so the layers above only ever see Numbers.
function normalise(value) {
  if (typeof value === 'bigint') return Number(value);
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) value[key] = normalise(value[key]);
  return value;
}

export const db = {
  /** Fetch a single row, or undefined. */
  get(sql, ...params) {
    return normalise(open().prepare(sql).get(...params));
  },

  /** Fetch every matching row. */
  all(sql, ...params) {
    return open().prepare(sql).all(...params).map(normalise);
  },

  /** Execute a write. Returns { changes, lastInsertRowid }. */
  run(sql, ...params) {
    const result = open().prepare(sql).run(...params);
    return {
      changes: Number(result.changes),
      lastInsertRowid: Number(result.lastInsertRowid)
    };
  },

  /**
   * Run `work` inside a transaction. Any throw rolls the whole thing back.
   * The escalation use case depends on this: four writes succeed together
   * or the case is left untouched.
   */
  transaction(work) {
    const conn = open();
    conn.exec('BEGIN');
    try {
      const result = work();
      conn.exec('COMMIT');
      return result;
    } catch (error) {
      conn.exec('ROLLBACK');
      throw error;
    }
  },

  close() {
    if (handle) { handle.close(); handle = null; }
  }
};

export default db;
