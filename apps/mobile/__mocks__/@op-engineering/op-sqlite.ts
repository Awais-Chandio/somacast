/// <reference types="node" />
// Jest stand-in for op-sqlite. The real library is a JSI native module and cannot run in Node,
// so this maps the small part of its API we use onto Node's built-in SQLite (node:sqlite).
// It is a real SQLite engine, so the SQL in SqliteOutboxStore is really executed in tests.
// Default location is in memory; pass a folder as `location` to get a file that survives a reopen.
import * as path from 'node:path';
import type { DatabaseSync as NodeDb } from 'node:sqlite';

type Scalar = string | number | boolean | null;

const { DatabaseSync } = process.getBuiltinModule(
  'node:sqlite',
) as typeof import('node:sqlite');

export function open(opts: { name: string; location?: string }) {
  // Same rule as the native module (found on the emulator): a present-but-undefined key throws.
  if ('location' in opts && typeof opts.location !== 'string') {
    throw new Error('Value is undefined, expected a String');
  }
  const file = opts.location ? path.join(opts.location, opts.name) : ':memory:';
  const db: NodeDb = new DatabaseSync(file);

  return {
    executeSync(query: string, params: Scalar[] = []) {
      const stmt = db.prepare(query);
      const args = params.map(p => (typeof p === 'boolean' ? Number(p) : p));
      if (stmt.columns().length > 0) {
        const rows = stmt.all(...args) as Array<Record<string, Scalar>>;
        return { rowsAffected: 0, rows };
      }
      const r = stmt.run(...args);
      return {
        rowsAffected: Number(r.changes),
        insertId: Number(r.lastInsertRowid),
        rows: [],
      };
    },
    close() {
      db.close();
    },
  };
}
