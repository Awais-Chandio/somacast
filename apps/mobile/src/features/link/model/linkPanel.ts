import {
  enqueue,
  flushOutbox,
  type LogEntry,
  type OutboxStore,
  type Transport,
} from '@somacast/core';

// Model for the link panel: pure functions, no React. The hook wires them to state.

export type Link = 'AOS' | 'LOS'; // acquisition / loss of signal

// SQLite stores can group many writes into one transaction; the memory store does not need to.
export type LocalOutbox = OutboxStore & { batch?: (fn: () => void) => void };

export type SyncStatus =
  | { phase: 'idle' }
  | { phase: 'syncing'; sent: number; total: number }
  | { phase: 'synced'; groundRows: number }
  | { phase: 'interrupted'; remaining: number };

export const BACKLOG_SIZE = 5000;
export const SYNC_BATCH = 200;
const FILL_CHUNK = 500;

// Gives the UI thread a turn between batches so the screen never freezes.
export const yieldToUi = () => new Promise<void>(r => setTimeout(r, 0));

// 1240 -> "1,240". Written by hand so it does not depend on Intl support in the JS engine.
export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function outboxText(pending: number): string {
  return `Outbox: ${formatCount(pending)} waiting`;
}

export function statusText(s: SyncStatus): string | null {
  switch (s.phase) {
    case 'idle':
      return null;
    case 'syncing':
      return `Syncing ${formatCount(s.sent)} / ${formatCount(s.total)}`;
    case 'synced':
      return `Synced. Ground has ${formatCount(s.groundRows)} rows`;
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
    groundRows: () => number;
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
      ? { phase: 'synced', groundRows: opts.groundRows() }
      : { phase: 'interrupted', remaining };
  opts.onStatus(final);
  return final;
}
