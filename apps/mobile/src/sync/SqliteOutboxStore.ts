import { open, type DB } from '@op-engineering/op-sqlite';
import type { LogEntry, OutboxItem, OutboxStore } from '@somacast/core';

// The phone's black-box outbox (REQ-007): same shape as MemoryOutboxStore in @somacast/core,
// but written to a SQLite file, so the backlog survives an app restart or a crash.
// The same file also keeps two small things that must survive a restart:
// - synced: keys the Supabase ground has acknowledged, so re-recording the history never queues
//   them again (the ground would ignore them, but the outbox would read "97 waiting" for nothing);
// - link_clock: when the link went down, so a handoff after a restart counts the whole blackout.
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
    db.executeSync('CREATE TABLE IF NOT EXISTS synced (key TEXT PRIMARY KEY)');
    db.executeSync(
      `CREATE TABLE IF NOT EXISTS link_clock (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        los_since TEXT
      )`,
    );
  }

  // A key the ground already acknowledged (synced) is not queued again.
  add(item: OutboxItem): void {
    this.db.executeSync(
      `INSERT OR IGNORE INTO outbox (key, entry, attempts, created_at)
       SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM synced WHERE key = ?)`,
      [
        item.key,
        JSON.stringify(item.entry),
        item.attempts,
        Date.now(),
        item.key,
      ],
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

  // markSent for a durable ground (Supabase): the keys also go to `synced`, in one transaction.
  markSynced(keys: string[]): void {
    this.batch(() => {
      this.inChunks(
        keys,
        marks => `INSERT OR IGNORE INTO synced (key) VALUES ${marks}`,
        '(?)',
      );
      this.markSent(keys);
    });
  }

  syncedCount(): number {
    const { rows } = this.db.executeSync('SELECT COUNT(*) AS n FROM synced');
    return Number(rows[0]?.n ?? 0);
  }

  // When the link went down (ISO), or null while it is up.
  getLosSince(): string | null {
    const { rows } = this.db.executeSync(
      'SELECT los_since FROM link_clock WHERE id = 1',
    );
    const v = rows[0]?.los_since;
    return typeof v === 'string' ? v : null;
  }

  setLosSince(iso: string | null): void {
    this.db.executeSync(
      'INSERT INTO link_clock (id, los_since) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET los_since = excluded.los_since',
      [iso],
    );
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

  // LIKE pattern on the idempotency key, e.g. '%:reading:backlog-%'.
  countKeysLike(pattern: string): number {
    const { rows } = this.db.executeSync(
      'SELECT COUNT(*) AS n FROM outbox WHERE key LIKE ?',
      [pattern],
    );
    return Number(rows[0]?.n ?? 0);
  }

  // Demo reset only. Real black-box entries are never deleted before the ground has them.
  // Also forgets the synced keys, so the demo's history is queued (and counted) again.
  clear(): void {
    this.db.executeSync('DELETE FROM outbox');
    this.db.executeSync('DELETE FROM synced');
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

  private inChunks(
    keys: string[],
    sql: (marks: string) => string,
    mark = '?',
  ): void {
    for (let i = 0; i < keys.length; i += CHUNK) {
      const chunk = keys.slice(i, i + CHUNK);
      this.db.executeSync(sql(chunk.map(() => mark).join(', ')), chunk);
    }
  }
}

export const OUTBOX_DB_NAME = 'somacast-outbox.db';

// One outbox file per account: the black box belongs to whoever is signed in. A crew member's
// outbox then holds only their own crew's entries, which RLS will accept; the offline demo keeps
// the original file. Owner ids are Supabase user ids (uuid), safe in a file name.
export function outboxDbName(owner?: string): string {
  return owner ? `somacast-outbox-${owner}.db` : OUTBOX_DB_NAME;
}

// Opens (or creates) the outbox file. `location` is for tests; the app uses op-sqlite's default folder.
// The key is left out when unset: the native open() rejects `location: undefined`.
export function openOutboxStore(
  location?: string,
  owner?: string,
): SqliteOutboxStore {
  const name = outboxDbName(owner);
  return new SqliteOutboxStore(open(location ? { name, location } : { name }));
}

const deviceOutboxes = new Map<string, SqliteOutboxStore>();

// One outbox per account per app process, opened on first use. No owner = offline demo.
export function getDeviceOutbox(owner?: string): SqliteOutboxStore {
  const id = owner ?? '';
  let store = deviceOutboxes.get(id);
  if (!store) {
    store = openOutboxStore(undefined, owner);
    deviceOutboxes.set(id, store);
  }
  return store;
}
