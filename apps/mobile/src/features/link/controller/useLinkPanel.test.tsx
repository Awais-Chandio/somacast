/// <reference types="node" />
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  MemoryOutboxStore,
  createRng,
  enqueue,
  idempotencyKey,
  type LogEntry,
} from '@somacast/core';
import {
  useLinkPanel,
  type LinkPanelController,
  type RemoteGround,
} from './useLinkPanel';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { openOutboxStore } from '../../../sync/SqliteOutboxStore';
import { recordHistory } from '../../../sync/blackBox';
import { forgetGroundChoice } from '../model/groundChoice';
import type { AosContact } from '../model/linkPanel';

async function renderPanel(
  store = new MemoryOutboxStore(),
  remote: RemoteGround | null = null,
  accountId: string | null = null,
) {
  const ref: { current: LinkPanelController | null } = { current: null };
  const random = createRng(11).next; // seeded link faults: same run every time
  function Probe(props: { remote: RemoteGround | null }) {
    ref.current = useLinkPanel(store, {
      random,
      remote: props.remote,
      accountId,
    });
    return null;
  }
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<Probe remote={remote} />);
  });
  const get = () => ref.current as LinkPanelController;
  // Re-render with a different remote (e.g. the Supabase client arrives after the first render).
  get.setRemote = (r: RemoteGround | null) =>
    ReactTestRenderer.act(() => {
      renderer?.update(<Probe remote={r} />);
    });
  get.unmount = () =>
    ReactTestRenderer.act(() => {
      renderer?.unmount();
    });
  return get;
}

const act = (fn: () => Promise<void>) => ReactTestRenderer.act(fn);

// Stand-in for Supabase: a keyed table (like the primary key on log_entries) and a count.
function fakeRemote(opts: { refuse?: boolean } = {}) {
  const rows = new Map<string, unknown>();
  const remote: RemoteGround = {
    transport: linkUp => async batch => {
      if (!linkUp()) throw new Error('LOS: no link');
      if (opts.refuse) throw new Error('Ground refused batch: RLS');
      for (const b of batch) if (!rows.has(b.key)) rows.set(b.key, b.entry);
      return { acked: batch.map(b => b.key) };
    },
    check: async () => ({ rows: rows.size, duplicates: 0 }),
  };
  return { remote, rows };
}

describe('useLinkPanel', () => {
  it('starts in LOS with the stored count', async () => {
    const store = new MemoryOutboxStore();
    store.add({
      key: 'k1',
      entry: {
        id: 'x',
        crewId: 'C1',
        timestamp: '2027-01-01T00:00:00.000Z',
        kind: 'reading',
        payload: {},
      },
      attempts: 0,
    });
    const p = await renderPanel(store);
    expect(p().link).toBe('LOS');
    expect(p().outbox.total).toBe(1);
    expect(p().status).toEqual({ phase: 'idle' });
  });

  it('LOS: fill backlog -> 5,000 waiting; AOS: syncs to 5,000 ground rows', async () => {
    const p = await renderPanel();
    await act(() => p().fillBacklog('C1'));
    expect(p().outbox).toEqual({ total: 5000, backlog: 5000, log: 0 });

    await act(() => p().toggleLink());
    expect(p().link).toBe('AOS');
    expect(p().status).toEqual({
      phase: 'synced',
      groundRows: 5000,
      duplicates: 0,
    });
    expect(p().outbox.total).toBe(0);
    expect(p().groundRows()).toBe(5000);
  });

  it('fill does nothing in AOS', async () => {
    const p = await renderPanel();
    await act(() => p().toggleLink());
    expect(p().canFill).toBe(false);
    await act(() => p().fillBacklog('C1'));
    expect(p().outbox.total).toBe(0);
  });

  it('reset in LOS empties outbox and ground and bumps the log epoch', async () => {
    const p = await renderPanel();
    await act(() => p().fillBacklog('C1'));
    await act(() => p().toggleLink()); // AOS: sync
    expect(p().groundRows()).toBe(5000);
    await act(() => p().toggleLink()); // back to LOS
    await act(() => p().fillBacklog('C1'));
    expect(p().outbox.total).toBe(5000);

    await act(async () => p().resetDemo());
    expect(p().outbox.total).toBe(0);
    expect(p().groundRows()).toBe(0);
    expect(p().status).toEqual({ phase: 'idle' });
    expect(p().resetEpoch).toBe(1);
  });

  it('reset does nothing in AOS', async () => {
    const p = await renderPanel();
    await act(() => p().fillBacklog('C1'));
    await act(() => p().toggleLink());
    expect(p().canReset).toBe(false);
    await act(async () => p().resetDemo());
    expect(p().groundRows()).toBe(5000);
    expect(p().resetEpoch).toBe(0);
  });

  it('without a remote ground only the demo ground is offered', async () => {
    const p = await renderPanel();
    expect(p().ground).toBe('demo');
    expect(p().hasRemote).toBe(false);
    await act(async () => p().selectGround('supabase'));
    expect(p().ground).toBe('demo');
  });

  it('signed in: syncs to the remote ground, not the demo ground', async () => {
    const { remote, rows } = fakeRemote();
    const p = await renderPanel(new MemoryOutboxStore(), remote);
    expect(p().ground).toBe('supabase');
    await act(() => p().fillBacklog('C1'));
    await act(() => p().toggleLink());
    expect(rows.size).toBe(5000);
    expect(p().groundRows()).toBe(0); // demo ground untouched
    expect(p().status).toEqual({
      phase: 'synced',
      groundRows: 5000,
      duplicates: 0,
    });
  });

  it('a refused batch is never acked: everything stays in the outbox', async () => {
    const { remote, rows } = fakeRemote({ refuse: true });
    const p = await renderPanel(new MemoryOutboxStore(), remote);
    await act(() => p().fillBacklog('C1'));
    await act(() => p().toggleLink());
    expect(rows.size).toBe(0);
    expect(p().outbox.total).toBe(5000);
    expect(p().status).toEqual({
      phase: 'interrupted',
      remaining: 5000,
      error: 'Ground refused batch: RLS',
    });
  });

  it('ground can be switched to demo in LOS only', async () => {
    const { remote, rows } = fakeRemote();
    const p = await renderPanel(new MemoryOutboxStore(), remote);
    await act(() => p().toggleLink()); // AOS
    expect(p().canSwitchGround).toBe(false);
    await act(async () => p().selectGround('demo'));
    expect(p().ground).toBe('supabase');

    await act(() => p().toggleLink()); // LOS
    await act(async () => p().selectGround('demo'));
    expect(p().ground).toBe('demo');
    await act(() => p().fillBacklog('C1'));
    await act(() => p().toggleLink());
    expect(p().groundRows()).toBe(5000);
    expect(rows.size).toBe(0);
  });

  describe('ground choice per account', () => {
    beforeEach(() => {
      forgetGroundChoice('maya');
      forgetGroundChoice('kenji');
    });

    it('signed in always starts on Supabase, even if the remote arrives late', async () => {
      const { remote } = fakeRemote();
      const p = await renderPanel(new MemoryOutboxStore(), null, 'maya');
      expect(p().ground).toBe('demo'); // no remote yet: offline demo only
      await p.setRemote(remote);
      expect(p().ground).toBe('supabase');
      expect(p().hasRemote).toBe(true);
    });

    it("one account's Demo choice is kept for it and never leaks to another", async () => {
      const { remote } = fakeRemote();
      const maya = await renderPanel(new MemoryOutboxStore(), remote, 'maya');
      await act(async () => maya().selectGround('demo'));
      expect(maya().ground).toBe('demo');
      await maya.unmount();

      const kenji = await renderPanel(new MemoryOutboxStore(), remote, 'kenji');
      expect(kenji().ground).toBe('supabase');

      const mayaAgain = await renderPanel(
        new MemoryOutboxStore(),
        remote,
        'maya',
      );
      expect(mayaAgain().ground).toBe('demo'); // same session, same account
    });

    it('a fresh sign-in (forgetGroundChoice) starts on Supabase again', async () => {
      const { remote } = fakeRemote();
      const p = await renderPanel(new MemoryOutboxStore(), remote, 'maya');
      await act(async () => p().selectGround('demo'));
      await p.unmount();
      forgetGroundChoice('maya'); // what useAuth.signIn does
      const again = await renderPanel(new MemoryOutboxStore(), remote, 'maya');
      expect(again().ground).toBe('supabase');
    });

    it('losing the remote falls back to Demo, getting it back restores Supabase', async () => {
      const { remote } = fakeRemote();
      const p = await renderPanel(new MemoryOutboxStore(), remote, 'maya');
      await p.setRemote(null);
      expect(p().ground).toBe('demo');
      await p.setRemote(remote);
      expect(p().ground).toBe('supabase');
    });
  });

  describe('AOS handoff (atAos)', () => {
    const entry = (
      id: string,
      kind: LogEntry['kind'] = 'reading',
    ): LogEntry => ({
      id,
      crewId: 'C2',
      timestamp: '2027-03-17T00:00:00.000Z',
      kind,
      payload: { type: kind === 'crew_action' ? 'handoff' : undefined },
    });

    // A clock that moves 5 minutes per reading, so LOS and AOS get different times.
    function stepClock(start = Date.parse('2026-10-17T14:00:00.000Z')) {
      let t = start;
      return () => {
        const d = new Date(t);
        t += 5 * 60_000;
        return d;
      };
    }

    async function renderWithAos(
      remote: RemoteGround | null,
      atAos: (c: AosContact) => LogEntry[],
      store = new MemoryOutboxStore(),
    ) {
      const ref: { current: LinkPanelController | null } = { current: null };
      const now = stepClock();
      const random = createRng(11).next;
      function Probe() {
        ref.current = useLinkPanel(store, { random, remote, atAos, now });
        return null;
      }
      await ReactTestRenderer.act(() => {
        ReactTestRenderer.create(<Probe />);
      });
      return { get: () => ref.current as LinkPanelController, store };
    }

    it('sends the backlog, then the handoff in the same AOS, and reports the contact', async () => {
      const { remote, rows } = fakeRemote();
      const seen: AosContact[] = [];
      const handoff = entry('handoff-1', 'crew_action');
      const store = new MemoryOutboxStore();
      enqueue(store, entry('r1'));
      enqueue(store, entry('r2'));
      const { get } = await renderWithAos(
        remote,
        c => {
          seen.push(c);
          expect(rows.size).toBe(2); // the backlog is home before the handoff is made
          return [handoff];
        },
        store,
      );
      expect(get().contact).toBe(null);

      await act(() => get().toggleLink());
      expect(seen).toEqual([
        {
          losSince: '2026-10-17T14:00:00.000Z',
          aosAt: '2026-10-17T14:05:00.000Z',
          held: 2,
        },
      ]);
      expect(rows.has(idempotencyKey(handoff))).toBe(true);
      expect(get().outbox.total).toBe(0);
      expect(get().contact).toEqual({
        ...seen[0],
        ground: 'supabase',
        sent: [handoff],
      });
    });

    it('LOS restarts the blackout clock; the next AOS makes a new contact', async () => {
      const { remote } = fakeRemote();
      const seen: AosContact[] = [];
      const { get } = await renderWithAos(remote, c => {
        seen.push(c);
        return [];
      });
      await act(() => get().toggleLink()); // AOS at 14:05
      await act(() => get().toggleLink()); // LOS at 14:10
      await act(() => get().toggleLink()); // AOS at 14:15
      expect(seen.map(c => [c.losSince, c.aosAt])).toEqual([
        ['2026-10-17T14:00:00.000Z', '2026-10-17T14:05:00.000Z'],
        ['2026-10-17T14:10:00.000Z', '2026-10-17T14:15:00.000Z'],
      ]);
      expect(get().contact?.aosAt).toBe('2026-10-17T14:15:00.000Z');
    });

    // The app is killed and reopened: a new hook on a new store over the same SQLite file.
    async function restartable(dir: string, startAt: string) {
      const { remote, rows } = fakeRemote();
      const seen: AosContact[] = [];
      const open = async (at: string) => {
        const store = openOutboxStore(dir, 'u-kenji');
        const ref: { current: LinkPanelController | null } = { current: null };
        const now = stepClock(Date.parse(at));
        let r!: ReactTestRenderer.ReactTestRenderer;
        function Probe() {
          ref.current = useLinkPanel(store, {
            remote,
            now,
            atAos: c => {
              seen.push(c);
              return [];
            },
          });
          return null;
        }
        await ReactTestRenderer.act(() => {
          r = ReactTestRenderer.create(<Probe />);
        });
        return {
          store,
          get: () => ref.current as LinkPanelController,
          kill: () => ReactTestRenderer.act(() => r.unmount()),
        };
      };
      return { first: await open(startAt), open, seen, rows };
    }

    const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'somacast-link-'));

    it('LOS, restart, AOS: the handoff counts the blackout from the real LOS start', async () => {
      const dir = tmp();
      try {
        const { first, open, seen } = await restartable(
          dir,
          '2026-10-18T11:43:00.000Z',
        );
        await first.kill(); // killed in LOS
        const app = await open('2026-10-18T11:50:00.000Z'); // reopened 7 min later
        await act(() => app.get().toggleLink()); // AOS at 11:50
        expect(seen).toEqual([
          {
            losSince: '2026-10-18T11:43:00.000Z',
            aosAt: '2026-10-18T11:50:00.000Z',
            held: 0,
          },
        ]);
        expect(app.store.getLosSince()).toBe(null); // the link is up
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('killed while the link is up: the reopen starts a new LOS', async () => {
      const dir = tmp();
      try {
        const { first, open, seen } = await restartable(
          dir,
          '2026-10-18T11:43:00.000Z',
        );
        await act(() => first.get().toggleLink()); // AOS at 11:43
        await first.kill();
        const app = await open('2026-10-18T12:00:00.000Z');
        await act(() => app.get().toggleLink()); // AOS at 12:00
        expect(seen[1]!.losSince).toBe('2026-10-18T12:00:00.000Z');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('after a sync to Supabase and a restart, the requeued history leaves 0 waiting', async () => {
      const dir = tmp();
      try {
        const history = Array.from({ length: 97 }, (_, i) => entry(`h${i}`));
        const { first, open, rows } = await restartable(
          dir,
          '2026-10-18T11:43:00.000Z',
        );
        recordHistory(first.store, history);
        await act(async () => first.get().refresh());
        expect(first.get().outbox.total).toBe(97);
        await act(() => first.get().toggleLink()); // AOS: everything home
        expect(rows.size).toBe(97);
        await first.kill();

        const app = await open('2026-10-18T11:50:00.000Z');
        expect(recordHistory(app.store, history)).toBe(0); // the Today screen records it again
        await act(async () => app.get().refresh());
        expect(app.get().outbox.total).toBe(0);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('a demo reset restarts the blackout clock and queues the history again', async () => {
      const dir = tmp();
      try {
        const history = [entry('h0'), entry('h1')];
        const { first, seen } = await restartable(
          dir,
          '2026-10-18T11:43:00.000Z',
        );
        recordHistory(first.store, history);
        // The step clock moves 5 min per reading: opened 11:43.
        await act(() => first.get().toggleLink()); // AOS 11:48, synced
        await act(() => first.get().toggleLink()); // LOS 11:53
        await act(async () => first.get().resetDemo()); // reset at 11:58
        expect(recordHistory(first.store, history)).toBe(2);
        await act(() => first.get().toggleLink()); // AOS 12:03
        expect(seen.at(-1)!.losSince).toBe('2026-10-18T11:58:00.000Z');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('ground refuses the backlog: no handoff is made, no contact', async () => {
      const { remote } = fakeRemote({ refuse: true });
      const atAos = jest.fn(() => [entry('handoff-x', 'crew_action')]);
      const store = new MemoryOutboxStore();
      enqueue(store, entry('r1'));
      const { get } = await renderWithAos(remote, atAos, store);
      await act(() => get().toggleLink());
      expect(atAos).not.toHaveBeenCalled();
      expect(get().contact).toBe(null);
      expect(get().outbox.total).toBe(1);
    });

    it('demo ground: the contact says so (no notes to fetch there)', async () => {
      const { get } = await renderWithAos(null, () => [
        entry('handoff-d', 'crew_action'),
      ]);
      await act(() => get().toggleLink());
      expect(get().contact?.ground).toBe('demo');
      expect(get().groundRows()).toBe(1);
    });

    it('a demo reset clears the contact', async () => {
      const { get } = await renderWithAos(null, () => []);
      await act(() => get().toggleLink());
      expect(get().contact).not.toBe(null);
      await act(() => get().toggleLink());
      await act(async () => get().resetDemo());
      expect(get().contact).toBe(null);
    });
  });
});
