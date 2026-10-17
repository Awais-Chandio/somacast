import { describe, it, expect } from '@jest/globals';
import {
  MemoryOutboxStore,
  MockGroundStore,
  enqueue,
  flushOutbox,
  mockTransport,
  isLinkUp,
  createRng,
  LogEntrySchema,
  type LogEntry,
} from '../index';

function entries(n: number): LogEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    crewId: `C${(i % 4) + 1}`,
    timestamp: new Date(Date.UTC(2027, 1, 14, 0, 0, i)).toISOString(),
    kind: 'reading' as const,
    payload: { n: i },
  }));
}

describe('outbox', () => {
  it('entries are valid log entries', () => {
    for (const e of entries(3))
      expect(LogEntrySchema.safeParse(e).success).toBe(true);
  });

  it('writes locally during LOS and sends nothing', async () => {
    const store = new MemoryOutboxStore();
    const ground = new MockGroundStore();
    for (const e of entries(50)) enqueue(store, e);
    const r = await flushOutbox(
      store,
      mockTransport(ground, { linkUp: () => false }),
      { maxBatches: 3 },
    );
    expect(ground.size()).toBe(0);
    expect(store.pendingCount()).toBe(50);
    expect(r.failedBatches).toBe(3);
    expect(r.lastError).toBe('LOS: no link');
  });

  it('enqueueing the same entry twice keeps one copy', () => {
    const store = new MemoryOutboxStore();
    const [e] = entries(1);
    enqueue(store, e!);
    enqueue(store, e!);
    expect(store.pendingCount()).toBe(1);
  });

  it('REQ-008: 5,000-item backlog syncs with exactly 5,000 rows, no duplicates, despite lost batches and lost acks', async () => {
    const store = new MemoryOutboxStore();
    const ground = new MockGroundStore();
    const items = entries(5000);
    for (const e of items) enqueue(store, e);
    const rng = createRng(99);
    const transport = mockTransport(ground, {
      linkUp: () => true,
      random: rng.next,
      failRate: 0.2,
      lostAckRate: 0.2,
    });
    const r = await flushOutbox(store, transport, {
      batchSize: 200,
      maxBatches: 500,
    });
    expect(r.remaining).toBe(0);
    expect(r.failedBatches).toBeGreaterThan(0); // the test really exercised retries
    expect(ground.size()).toBe(5000);
    expect(new Set(ground.keys()).size).toBe(5000);
  });

  it('keeps order: oldest items go first', async () => {
    const store = new MemoryOutboxStore();
    const sent: string[] = [];
    for (const e of entries(10)) enqueue(store, e);
    await flushOutbox(
      store,
      async b => {
        sent.push(...b.map(x => x.entry.id));
        return { acked: b.map(x => x.key) };
      },
      { batchSize: 3 },
    );
    expect(sent).toEqual(entries(10).map(e => e.id));
  });

  it('link schedule', () => {
    const blackouts: Array<[number, number]> = [[45, 75]];
    expect(isLinkUp(44, blackouts)).toBe(true);
    expect(isLinkUp(45, blackouts)).toBe(false);
    expect(isLinkUp(75, blackouts)).toBe(false);
    expect(isLinkUp(76, blackouts)).toBe(true);
  });
});
