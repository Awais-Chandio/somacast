/// <reference types="node" />
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  MockGroundStore,
  createRng,
  enqueue,
  flushOutbox,
  mockTransport,
  type LogEntry,
} from '@somacast/core';
import { openOutboxStore } from './SqliteOutboxStore';

// op-sqlite is native (JSI) and cannot run in Node. Jest uses __mocks__/@op-engineering/op-sqlite.ts,
// which runs the same SQL on Node's built-in SQLite, so the queries here are real.

function entries(n: number, prefix = 'e'): LogEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    crewId: 'C1',
    timestamp: '2027-02-14T00:00:00.000Z',
    kind: 'reading' as const,
    payload: { simulated: true, n: i },
  }));
}

describe('SqliteOutboxStore', () => {
  it('add is INSERT OR IGNORE: the same key twice keeps one row', () => {
    const store = openOutboxStore();
    const [e] = entries(1);
    enqueue(store, e!);
    enqueue(store, e!);
    expect(store.pendingCount()).toBe(1);
  });

  it('pending returns oldest first, with the entry intact, up to the limit', () => {
    const store = openOutboxStore();
    const es = entries(5);
    for (const e of es) enqueue(store, e);
    const got = store.pending(3);
    expect(got.map(i => i.entry.id)).toEqual(['e0', 'e1', 'e2']);
    expect(got[0]!.entry).toEqual(es[0]);
    expect(got[0]!.attempts).toBe(0);
  });

  it('markSent deletes more than one chunk (1,200 keys > 500)', () => {
    const store = openOutboxStore();
    for (const e of entries(1300)) enqueue(store, e);
    store.markSent(store.pending(1200).map(i => i.key));
    expect(store.pendingCount()).toBe(100);
    expect(store.pending(1)[0]!.entry.id).toBe('e1200');
  });

  it('bumpAttempts adds one per call and has() sees only pending keys', () => {
    const store = openOutboxStore();
    for (const e of entries(2)) enqueue(store, e);
    const [a, b] = store.pending(2).map(i => i.key);
    store.bumpAttempts([a!]);
    store.bumpAttempts([a!]);
    expect(store.pending(2).map(i => i.attempts)).toEqual([2, 0]);
    store.markSent([b!]);
    expect(store.has(a!)).toBe(true);
    expect(store.has(b!)).toBe(false);
  });

  it('batch rolls back every write when one fails', () => {
    const store = openOutboxStore();
    expect(() =>
      store.batch(() => {
        for (const e of entries(3)) enqueue(store, e);
        throw new Error('crash mid-write');
      }),
    ).toThrow('crash mid-write');
    expect(store.pendingCount()).toBe(0);
  });

  it('restart: a new store on the same file still has the backlog', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somacast-outbox-'));
    try {
      const before = openOutboxStore(dir);
      before.batch(() => {
        for (const e of entries(5000)) enqueue(before, e);
      });
      expect(before.pendingCount()).toBe(5000);

      const after = openOutboxStore(dir); // like the app being killed and reopened
      expect(after.pendingCount()).toBe(5000);
      expect(after.pending(1)[0]!.entry.id).toBe('e0');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('REQ-008 on SQLite: 5,000 items sync to exactly 5,000 ground rows despite lost batches and acks', async () => {
    const store = openOutboxStore();
    store.batch(() => {
      for (const e of entries(5000)) enqueue(store, e);
    });
    const ground = new MockGroundStore();
    const r = await flushOutbox(
      store,
      mockTransport(ground, {
        linkUp: () => true,
        random: createRng(7).next,
        failRate: 0.1,
        lostAckRate: 0.1,
      }),
      { batchSize: 200, maxBatches: 500 },
    );
    expect(r.remaining).toBe(0);
    expect(r.failedBatches).toBeGreaterThan(0);
    expect(ground.size()).toBe(5000);
    expect(new Set(ground.keys()).size).toBe(5000);
  });
});
