import {
  MemoryOutboxStore,
  MockGroundStore,
  createRng,
  mockTransport,
} from '@somacast/core';
import {
  backlogEntries,
  fillOutbox,
  formatCount,
  outboxText,
  statusText,
  syncOutbox,
  type SyncStatus,
} from './linkPanel';

const noPause = () => Promise.resolve();

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
    expect(outboxText(1240)).toBe('Outbox: 1,240 waiting');
  });

  it('words every sync phase', () => {
    expect(statusText({ phase: 'idle' })).toBeNull();
    expect(statusText({ phase: 'syncing', sent: 3200, total: 5000 })).toBe(
      'Syncing 3,200 / 5,000',
    );
    expect(statusText({ phase: 'synced', groundRows: 5000 })).toBe(
      'Synced. Ground has 5,000 rows',
    );
    expect(statusText({ phase: 'interrupted', remaining: 1800 })).toBe(
      'Link lost. 1,800 still waiting',
    );
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
  it('5,000 backlog syncs in batches of 200 with no duplicates, progress only goes up', async () => {
    const store = await filledStore(5000);
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
        groundRows: () => ground.size(),
        onStatus: s => seen.push(s),
        pause: async () => {
          pauses++;
        },
      },
    );

    expect(final).toEqual({ phase: 'synced', groundRows: 5000 });
    expect(store.pendingCount()).toBe(0);
    expect(new Set(ground.keys()).size).toBe(5000);

    const progress = seen.flatMap(s => (s.phase === 'syncing' ? [s] : []));
    expect(progress[0]).toEqual({ phase: 'syncing', sent: 0, total: 5000 });
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
        groundRows: () => ground.size(),
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
