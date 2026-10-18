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
import { openOutboxStore, outboxDbName } from './SqliteOutboxStore';

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

  it('countKeysLike counts backlog keys; clear empties the outbox', () => {
    const store = openOutboxStore();
    for (const e of entries(3, 'backlog-r1-')) enqueue(store, e);
    for (const e of entries(2, 'normal-C1-')) enqueue(store, e);
    expect(store.countKeysLike('%:reading:backlog-%')).toBe(3);
    store.clear();
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

  it('synced keys survive a restart and are never queued again; plain markSent forgets them', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somacast-outbox-'));
    try {
      const before = openOutboxStore(dir, 'u-kenji');
      const es = entries(1200); // more than one chunk of keys
      for (const e of es) enqueue(before, e);
      before.markSynced(before.pending(1200).map(i => i.key));
      expect(before.pendingCount()).toBe(0);
      expect(before.syncedCount()).toBe(1200);

      const after = openOutboxStore(dir, 'u-kenji'); // app killed and reopened
      after.batch(() => es.forEach(e => enqueue(after, e))); // history recorded again
      expect(after.pendingCount()).toBe(0);
      enqueue(after, entries(1, 'new-')[0]!); // a new entry still goes in
      expect(after.pendingCount()).toBe(1);

      after.markSent(after.pending(1).map(i => i.key)); // demo ground: not remembered
      enqueue(after, entries(1, 'new-')[0]!);
      expect(after.pendingCount()).toBe(1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('demo reset (clear) forgets the synced keys, so the history is queued again', () => {
    const store = openOutboxStore();
    const es = entries(3);
    for (const e of es) enqueue(store, e);
    store.markSynced(store.pending(3).map(i => i.key));
    store.clear();
    for (const e of es) enqueue(store, e);
    expect(store.pendingCount()).toBe(3);
    expect(store.syncedCount()).toBe(0);
  });

  it('LOS clock: survives a restart, null clears it, each account has its own', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somacast-outbox-'));
    try {
      const kenji = openOutboxStore(dir, 'u-kenji');
      expect(kenji.getLosSince()).toBe(null);
      kenji.setLosSince('2026-10-18T11:43:00.000Z');
      expect(openOutboxStore(dir, 'u-kenji').getLosSince()).toBe(
        '2026-10-18T11:43:00.000Z',
      );
      expect(openOutboxStore(dir, 'u-maya').getLosSince()).toBe(null);
      kenji.setLosSince(null);
      expect(openOutboxStore(dir, 'u-kenji').getLosSince()).toBe(null);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('each account has its own outbox file; no owner = the offline demo file', () => {
    expect(outboxDbName()).toBe('somacast-outbox.db');
    expect(outboxDbName('u-1')).toBe('somacast-outbox-u-1.db');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somacast-outbox-'));
    try {
      const maya = openOutboxStore(dir, 'u-maya');
      const offline = openOutboxStore(dir);
      for (const e of entries(3)) enqueue(offline, { ...e, crewId: 'C2' });
      expect(maya.pendingCount()).toBe(0); // offline C2 entries never reach Maya's sync
      expect(offline.pendingCount()).toBe(3);
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
