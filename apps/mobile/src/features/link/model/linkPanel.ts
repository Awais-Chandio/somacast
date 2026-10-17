import {
  enqueue,
  flushOutbox,
  type LogEntry,
  type OutboxStore,
  type Transport,
} from '@somacast/core';

// Model for the link panel: pure functions, no React. The hook wires them to state.

export type Link = 'AOS' | 'LOS'; // acquisition / loss of signal

// Optional extras a store can offer; each has a slower fallback that uses only the core interface.
// batch: many writes in one transaction. countKeysLike: SQL LIKE count on keys. clear: empty the outbox.
export type LocalOutbox = OutboxStore & {
  batch?: (fn: () => void) => void;
  countKeysLike?: (pattern: string) => number;
  clear?: () => void;
};

// What the ground side must offer for the duplicate check (MockGroundStore now, Supabase in Phase 7).
export type GroundView = { size(): number; keys(): string[] };

export type SyncStatus =
  | { phase: 'idle' }
  | { phase: 'syncing'; sent: number; total: number }
  | { phase: 'synced'; groundRows: number; duplicates: number }
  | { phase: 'interrupted'; remaining: number };

export const BACKLOG_SIZE = 5000;
export const SYNC_BATCH = 200;
const FILL_CHUNK = 500;

// Idempotency keys are crewId:kind:id, so every demo backlog key contains this mark.
const BACKLOG_KEY_MARK = ':reading:backlog-';

// Gives the UI thread a turn between batches so the screen never freezes.
export const yieldToUi = () => new Promise<void>(r => setTimeout(r, 0));

// 1240 -> "1,240". Written by hand so it does not depend on Intl support in the JS engine.
export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function plural(n: number, word: string): string {
  return `${formatCount(n)} ${word}${n === 1 ? '' : 's'}`;
}

// What is waiting: the demo backlog vs real black-box log entries.
export type OutboxBreakdown = { total: number; backlog: number; log: number };

export function outboxBreakdown(store: LocalOutbox): OutboxBreakdown {
  const total = store.pendingCount();
  const backlog = store.countKeysLike
    ? store.countKeysLike(`%${BACKLOG_KEY_MARK}%`)
    : store.pending(total).filter(i => i.key.includes(BACKLOG_KEY_MARK)).length;
  return { total, backlog, log: total - backlog };
}

export function outboxText(b: OutboxBreakdown): string {
  const head = `Outbox: ${formatCount(b.total)} waiting`;
  if (b.total === 0) return head;
  return `${head} (${formatCount(b.backlog)} backlog + ${formatCount(
    b.log,
  )} log)`;
}

// Rows the ground holds minus distinct idempotency keys among them. Anything above 0 is a duplicate.
export function duplicateCount(ground: GroundView): number {
  return ground.size() - new Set(ground.keys()).size;
}

// Demo reset: empties the outbox (the ground store is replaced by the hook).
export function clearOutbox(store: LocalOutbox): void {
  if (store.clear) store.clear();
  else store.markSent(store.pending(store.pendingCount()).map(i => i.key));
}

export function statusText(s: SyncStatus): string | null {
  switch (s.phase) {
    case 'idle':
      return null;
    case 'syncing':
      return `Syncing ${formatCount(s.sent)} / ${formatCount(s.total)}`;
    case 'synced':
      return `Synced. Ground has ${plural(s.groundRows, 'row')}, ${plural(
        s.duplicates,
        'duplicate',
      )}`;
    case 'interrupted':
      return `Link lost. ${formatCount(s.remaining)} still waiting`;
  }
}

// Demo backlog: n simulated 'reading' entries. runId keeps ids unique across fills and restarts.
export function backlogEntries(
  n: number,
  crewId: string,
  runId: string,
  now = new Date(),
): LogEntry[] {
  const timestamp = now.toISOString();
  return Array.from({ length: n }, (_, i) => ({
    id: `backlog-${runId}-${i}`,
    crewId,
    timestamp,
    kind: 'reading' as const,
    payload: { simulated: true, demoBacklog: true, seq: i },
  }));
}

// Writes entries to the outbox in chunks, yielding between chunks.
export async function fillOutbox(
  store: LocalOutbox,
  entries: LogEntry[],
  opts: { onProgress?: () => void; pause?: () => Promise<void> } = {},
): Promise<void> {
  const pause = opts.pause ?? yieldToUi;
  for (let i = 0; i < entries.length; i += FILL_CHUNK) {
    const chunk = entries.slice(i, i + FILL_CHUNK);
    const write = () => chunk.forEach(e => enqueue(store, e));
    if (store.batch) store.batch(write);
    else write();
    opts.onProgress?.();
    await pause();
  }
}

// Sends the outbox one batch at a time while the link is up, reporting progress after each batch.
// Stops when the outbox is empty, the link drops, or maxBatches is used up. Nothing is lost on a stop.
export async function syncOutbox(
  store: OutboxStore,
  transport: Transport,
  opts: {
    isLinkUp: () => boolean;
    ground: GroundView;
    onStatus: (s: SyncStatus) => void;
    batchSize?: number;
    maxBatches?: number;
    pause?: () => Promise<void>;
  },
): Promise<SyncStatus> {
  const pause = opts.pause ?? yieldToUi;
  const maxBatches = opts.maxBatches ?? 1000;
  let sent = 0;
  let total = store.pendingCount();
  opts.onStatus({ phase: 'syncing', sent, total });

  for (
    let i = 0;
    i < maxBatches && opts.isLinkUp() && store.pendingCount() > 0;
    i++
  ) {
    const r = await flushOutbox(store, transport, {
      batchSize: opts.batchSize ?? SYNC_BATCH,
      maxBatches: 1,
    });
    sent += r.acked;
    total = Math.max(total, sent + r.remaining); // new entries may arrive mid-sync
    opts.onStatus({ phase: 'syncing', sent, total });
    await pause();
  }

  const remaining = store.pendingCount();
  const final: SyncStatus =
    remaining === 0
      ? {
          phase: 'synced',
          groundRows: opts.ground.size(),
          duplicates: duplicateCount(opts.ground),
        }
      : { phase: 'interrupted', remaining };
  opts.onStatus(final);
  return final;
}
