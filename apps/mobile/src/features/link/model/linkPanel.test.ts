import {
  MemoryOutboxStore,
  MockGroundStore,
  createRng,
  enqueue,
  mockTransport,
  type LogEntry,
} from '@somacast/core';
import {
  backlogEntries,
  clearOutbox,
  duplicateCount,
  fillOutbox,
  formatCount,
  outboxBreakdown,
  outboxText,
  statusText,
  syncOutbox,
  type SyncStatus,
} from './linkPanel';

const noPause = () => Promise.resolve();

// A real black-box entry, like the one the Today screen writes for the day it shows.
const logEntry: LogEntry = {
  id: 'normal-C1-89-reading',
  crewId: 'C1',
  timestamp: '2027-03-31T00:00:00.000Z',
  kind: 'reading',
  payload: { simulated: true },
};

function filledStore(n: number) {
  const store = new MemoryOutboxStore();
  return fillOutbox(store, backlogEntries(n, 'C1', 'run1'), {
    pause: noPause,
  }).then(() => store);
}

describe('link panel text', () => {
  it('formats counts with thousands separators', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1240)).toBe('1,240');
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(outboxText({ total: 0, backlog: 0, log: 0 })).toBe(
      'Outbox: 0 waiting',
    );
    expect(outboxText({ total: 5001, backlog: 5000, log: 1 })).toBe(
      'Outbox: 5,001 waiting (5,000 backlog + 1 log)',
    );
  });

  it('words every sync phase', () => {
    expect(statusText({ phase: 'idle' })).toBeNull();
    expect(statusText({ phase: 'syncing', sent: 3200, total: 5000 })).toBe(
      'Syncing 3,200 / 5,000',
    );
    expect(
      statusText({ phase: 'synced', groundRows: 5001, duplicates: 0 }),
    ).toBe('Synced. Ground has 5,001 rows, 0 duplicates');
    expect(statusText({ phase: 'synced', groundRows: 1, duplicates: 1 })).toBe(
      'Synced. Ground has 1 row, 1 duplicate',
    );
    expect(statusText({ phase: 'interrupted', remaining: 1800 })).toBe(
      'Link lost. 1,800 still waiting',
    );
  });
});

describe('outbox breakdown, duplicate check, reset', () => {
  it('splits the outbox into demo backlog and black-box log entries', async () => {
    const store = await filledStore(5000);
    enqueue(store, logEntry);
    expect(outboxBreakdown(store)).toEqual({
      total: 5001,
      backlog: 5000,
      log: 1,
    });
  });

  it('duplicates = ground rows minus unique keys', () => {
    expect(duplicateCount({ size: () => 3, keys: () => ['a', 'b', 'c'] })).toBe(
      0,
    );
    // A ground without a unique key constraint would store a resent row twice.
    expect(duplicateCount({ size: () => 3, keys: () => ['a', 'a', 'b'] })).toBe(
      1,
    );
  });

  it('clearOutbox empties a store that has no clear() of its own', async () => {
    const store = await filledStore(1200);
    clearOutbox(store);
    expect(store.pendingCount()).toBe(0);
  });
});

describe('fillOutbox', () => {
  it('writes 5,000 unique entries and yields between chunks', async () => {
    const store = new MemoryOutboxStore();
    let pauses = 0;
    await fillOutbox(store, backlogEntries(5000, 'C1', 'run1'), {
      pause: async () => {
        pauses++;
      },
    });
    expect(store.pendingCount()).toBe(5000);
    expect(pauses).toBe(10); // 5,000 in chunks of 500
  });

  it('a second fill with a new runId adds 5,000 more; the same runId adds none', async () => {
    const store = await filledStore(5000);
    await fillOutbox(store, backlogEntries(5000, 'C1', 'run1'), {
      pause: noPause,
    });
    expect(store.pendingCount()).toBe(5000);
    await fillOutbox(store, backlogEntries(5000, 'C1', 'run2'), {
      pause: noPause,
    });
    expect(store.pendingCount()).toBe(10000);
  });

  it('uses the store transaction when it has one', async () => {
    const store = Object.assign(new MemoryOutboxStore(), {
      batches: 0,
      batch(fn: () => void) {
        this.batches++;
        fn();
      },
    });
    await fillOutbox(store, backlogEntries(1200, 'C1', 'r'), {
      pause: noPause,
    });
    expect(store.batches).toBe(3);
  });
});

describe('syncOutbox', () => {
  it('5,000 backlog + 1 log syncs in batches of 200 with 0 duplicates, progress only goes up', async () => {
    const store = await filledStore(5000);
    enqueue(store, logEntry);
    const ground = new MockGroundStore();
    const seen: SyncStatus[] = [];
    let pauses = 0;
    const final = await syncOutbox(
      store,
      mockTransport(ground, {
        linkUp: () => true,
        random: createRng(3).next,
        failRate: 0.1,
        lostAckRate: 0.1,
      }),
      {
        isLinkUp: () => true,
        ground,
        onStatus: s => seen.push(s),
        pause: async () => {
          pauses++;
        },
      },
    );

    expect(final).toEqual({
      phase: 'synced',
      groundRows: 5001,
      duplicates: 0,
    });
    expect(store.pendingCount()).toBe(0);
    expect(new Set(ground.keys()).size).toBe(5001);

    const progress = seen.flatMap(s => (s.phase === 'syncing' ? [s] : []));
    expect(progress[0]).toEqual({ phase: 'syncing', sent: 0, total: 5001 });
    for (let i = 1; i < progress.length; i++) {
      expect(progress[i]!.sent).toBeGreaterThanOrEqual(progress[i - 1]!.sent);
      expect(progress[i]!.sent - progress[i - 1]!.sent).toBeLessThanOrEqual(
        200,
      );
    }
    expect(pauses).toBeGreaterThanOrEqual(25); // at least 5,000 / 200 batches, each followed by a yield
  });

  it('stops when the link drops; the rest stays in the outbox', async () => {
    const store = await filledStore(1000);
    const ground = new MockGroundStore();
    let up = true;
    let batches = 0;
    const final = await syncOutbox(
      store,
      mockTransport(ground, { linkUp: () => up }),
      {
        isLinkUp: () => up,
        ground,
        onStatus: () => {},
        pause: async () => {
          if (++batches === 2) up = false; // LOS after two batches
        },
      },
    );
    expect(final).toEqual({ phase: 'interrupted', remaining: 600 });
    expect(ground.size()).toBe(400);
    expect(store.pendingCount()).toBe(600);
  });
});
