// Black-box outbox (REQ-007, REQ-008).
// During loss of signal (LOS) everything is written locally first. When the link returns (AOS) the outbox
// sends it in batches. Each item has an idempotency key, so a batch that is sent twice (for example because
// the acknowledgement was lost) is stored only once on the ground.
import type { LogEntry } from '../domain/schemas';

export type OutboxItem = {
  key: string; // idempotency key, never reused
  entry: LogEntry;
  attempts: number;
};

// Storage behind the outbox. Memory version here; the phone uses a SQLite version with the same shape.
export interface OutboxStore {
  add(item: OutboxItem): void;
  has(key: string): boolean;
  pending(limit: number): OutboxItem[]; // oldest first
  markSent(keys: string[]): void;
  bumpAttempts(keys: string[]): void;
  pendingCount(): number;
}

export class MemoryOutboxStore implements OutboxStore {
  private items = new Map<string, OutboxItem>(); // Map keeps insertion order = oldest first
  add(item: OutboxItem): void {
    if (!this.items.has(item.key)) this.items.set(item.key, item);
  }
  has(key: string): boolean {
    return this.items.has(key);
  }
  pending(limit: number): OutboxItem[] {
    const out: OutboxItem[] = [];
    for (const item of this.items.values()) {
      if (out.length >= limit) break;
      out.push(item);
    }
    return out;
  }
  markSent(keys: string[]): void {
    for (const k of keys) this.items.delete(k);
  }
  bumpAttempts(keys: string[]): void {
    for (const k of keys) {
      const item = this.items.get(k);
      if (item) item.attempts++;
    }
  }
  pendingCount(): number {
    return this.items.size;
  }
}

export function idempotencyKey(entry: LogEntry): string {
  return `${entry.crewId}:${entry.kind}:${entry.id}`;
}

// Writing locally always works, link or no link. Adding the same entry twice is a no-op.
export function enqueue(store: OutboxStore, entry: LogEntry): string {
  const key = idempotencyKey(entry);
  store.add({ key, entry, attempts: 0 });
  return key;
}

// Sends a batch and returns the keys the ground confirmed it has stored.
export type Transport = (batch: OutboxItem[]) => Promise<{ acked: string[] }>;

export type FlushResult = {
  sentBatches: number;
  failedBatches: number;
  acked: number;
  remaining: number;
  lastError?: string; // message of the last failed batch, for the UI and logs
};

// Sends pending items in batches until the outbox is empty or maxBatches attempts are used.
// A failed batch stays in the outbox and is retried; nothing is lost.
export async function flushOutbox(
  store: OutboxStore,
  transport: Transport,
  opts: { batchSize?: number; maxBatches?: number } = {},
): Promise<FlushResult> {
  const batchSize = opts.batchSize ?? 200;
  const maxBatches = opts.maxBatches ?? 1000;
  const result: FlushResult = {
    sentBatches: 0,
    failedBatches: 0,
    acked: 0,
    remaining: store.pendingCount(),
  };

  for (let i = 0; i < maxBatches && store.pendingCount() > 0; i++) {
    const batch = store.pending(batchSize);
    try {
      const { acked } = await transport(batch);
      const valid = acked.filter(k => store.has(k));
      store.markSent(valid);
      const notAcked = batch.map(b => b.key).filter(k => !valid.includes(k));
      store.bumpAttempts(notAcked);
      result.sentBatches++;
      result.acked += valid.length;
    } catch (e) {
      store.bumpAttempts(batch.map(b => b.key));
      result.failedBatches++;
      result.lastError = e instanceof Error ? e.message : String(e);
    }
  }
  result.remaining = store.pendingCount();
  return result;
}

// In-memory ground database: the offline "demo ground" (Supabase is the real one). It ignores keys it has already stored.
export class MockGroundStore {
  private rows = new Map<string, LogEntry>();
  receive(batch: OutboxItem[]): string[] {
    for (const item of batch)
      if (!this.rows.has(item.key)) this.rows.set(item.key, item.entry);
    return batch.map(b => b.key);
  }
  size(): number {
    return this.rows.size;
  }
  keys(): string[] {
    return [...this.rows.keys()];
  }
}

// Fake radio link for tests and the demo. failRate: whole batch lost on the way up.
// lostAckRate: ground stored the batch but the acknowledgement was lost, so the phone sends it again.
export function mockTransport(
  ground: MockGroundStore,
  opts: {
    linkUp: () => boolean;
    random?: () => number;
    failRate?: number;
    lostAckRate?: number;
  },
): Transport {
  const random = opts.random ?? Math.random;
  return async batch => {
    if (!opts.linkUp()) throw new Error('LOS: no link');
    if (random() < (opts.failRate ?? 0)) throw new Error('batch lost');
    const acked = ground.receive(batch);
    if (random() < (opts.lostAckRate ?? 0)) throw new Error('ack lost');
    return { acked };
  };
}

// Link schedule: list of [startDay, endDay] blackout windows (inclusive).
export function isLinkUp(
  day: number,
  blackouts: Array<[number, number]>,
): boolean {
  return !blackouts.some(([s, e]) => day >= s && day <= e);
}
