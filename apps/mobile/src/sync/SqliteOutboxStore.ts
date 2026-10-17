import { open, type DB } from '@op-engineering/op-sqlite';
import type { LogEntry, OutboxItem, OutboxStore } from '@somacast/core';

// The phone's black-box outbox (REQ-007): same shape as MemoryOutboxStore in @somacast/core,
// but written to a SQLite file, so the backlog survives an app restart or a crash.
// executeSync blocks the JS thread, so callers keep each call small (batches of 200-500).

const CHUNK = 500; // keys per DELETE / UPDATE, well under SQLite's bound-parameter limit

type SqlDb = Pick<DB, 'executeSync'>;

export class SqliteOutboxStore implements OutboxStore {
  constructor(private readonly db: SqlDb) {
    // WAL + NORMAL: a commit survives the app being killed; only a power cut can lose the last commit.
    db.executeSync('PRAGMA journal_mode = WAL');
    db.executeSync('PRAGMA synchronous = NORMAL');
    db.executeSync(
      `CREATE TABLE IF NOT EXISTS outbox (
        key TEXT PRIMARY KEY,
        entry TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,
    );
  }

  add(item: OutboxItem): void {
    this.db.executeSync(
      'INSERT OR IGNORE INTO outbox (key, entry, attempts, created_at) VALUES (?, ?, ?, ?)',
      [item.key, JSON.stringify(item.entry), item.attempts, Date.now()],
    );
  }

  has(key: string): boolean {
    return (
      this.db.executeSync('SELECT 1 FROM outbox WHERE key = ? LIMIT 1', [key])
        .rows.length > 0
    );
  }

  // Oldest first; rowid breaks ties between items written in the same millisecond.
  pending(limit: number): OutboxItem[] {
    const { rows } = this.db.executeSync(
      'SELECT key, entry, attempts FROM outbox ORDER BY created_at, rowid LIMIT ?',
      [limit],
    );
    return rows.map(r => ({
      key: String(r.key),
      entry: JSON.parse(String(r.entry)) as LogEntry,
      attempts: Number(r.attempts),
    }));
  }

  markSent(keys: string[]): void {
    this.inChunks(keys, marks => `DELETE FROM outbox WHERE key IN (${marks})`);
  }

  bumpAttempts(keys: string[]): void {
    this.inChunks(
      keys,
      marks =>
        `UPDATE outbox SET attempts = attempts + 1 WHERE key IN (${marks})`,
    );
  }

  pendingCount(): number {
    const { rows } = this.db.executeSync('SELECT COUNT(*) AS n FROM outbox');
    return Number(rows[0]?.n ?? 0);
  }

  // Runs many writes as one transaction: one disk commit instead of one per row.
  batch(fn: () => void): void {
    this.db.executeSync('BEGIN');
    try {
      fn();
      this.db.executeSync('COMMIT');
    } catch (e) {
      this.db.executeSync('ROLLBACK');
      throw e;
    }
  }

  private inChunks(keys: string[], sql: (marks: string) => string): void {
    for (let i = 0; i < keys.length; i += CHUNK) {
      const chunk = keys.slice(i, i + CHUNK);
      this.db.executeSync(sql(chunk.map(() => '?').join(', ')), chunk);
    }
  }
}

export const OUTBOX_DB_NAME = 'somacast-outbox.db';

// Opens (or creates) the outbox file. `location` is for tests; the app uses op-sqlite's default folder.
// The key is left out when unset: the native open() rejects `location: undefined`.
export function openOutboxStore(location?: string): SqliteOutboxStore {
  return new SqliteOutboxStore(
    open(
      location ? { name: OUTBOX_DB_NAME, location } : { name: OUTBOX_DB_NAME },
    ),
  );
}

let deviceOutbox: SqliteOutboxStore | null = null;

// One outbox per app process, opened on first use.
export function getDeviceOutbox(): SqliteOutboxStore {
  deviceOutbox ??= openOutboxStore();
  return deviceOutbox;
}
