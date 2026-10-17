import { useCallback, useRef, useState } from 'react';
import { MockGroundStore, mockTransport, type Transport } from '@somacast/core';
import {
  BACKLOG_SIZE,
  backlogEntries,
  clearOutbox,
  demoGroundCheck,
  fillOutbox,
  outboxBreakdown,
  syncOutbox,
  type GroundCheck,
  type Link,
  type LocalOutbox,
  type SyncStatus,
} from '../model/linkPanel';

// Demo radio link: 10% of batches lost on the way up, 10% of acknowledgements lost on the way down.
const LINK_FAULTS = { failRate: 0.1, lostAckRate: 0.1 };

// Where synced entries go: the real Supabase ground, or the in-memory demo ground (offline demo).
export type GroundMode = 'supabase' | 'demo';

// The real ground, built by the screen from a signed-in Supabase client (see SupabaseTransport).
export type RemoteGround = {
  transport: (linkUp: () => boolean) => Transport;
  check: GroundCheck;
};

// Controller: link state, outbox count, ground choice and sync progress. The sending logic lives in
// the model. Without `remote` (offline, not signed in) only the demo ground is available.
export function useLinkPanel(
  store: LocalOutbox,
  opts: { random?: () => number; remote?: RemoteGround | null } = {},
) {
  const [link, setLink] = useState<Link>('LOS'); // the app always starts in LOS
  const linkRef = useRef<Link>('LOS');
  const [outbox, setOutbox] = useState(() => outboxBreakdown(store));
  const [status, setStatus] = useState<SyncStatus>({ phase: 'idle' });
  const [filling, setFilling] = useState(false);
  const fillingRef = useRef(false);
  const syncing = useRef(false);
  const ground = useRef(new MockGroundStore());
  // Bumped by a reset so the Today screen logs the day it is showing again.
  const [resetEpoch, setResetEpoch] = useState(0);
  const { random, remote } = opts;
  const [groundMode, setGroundMode] = useState<GroundMode>(
    remote ? 'supabase' : 'demo',
  );
  const groundRef = useRef<GroundMode>(groundMode);

  const refresh = useCallback(() => setOutbox(outboxBreakdown(store)), [store]);

  const sync = useCallback(async () => {
    if (syncing.current) return; // the running sync keeps going while the link is up
    syncing.current = true;
    const linkUp = () => linkRef.current === 'AOS';
    // The real ground gets the real network (its own faults); the demo ground gets simulated faults.
    const real = groundRef.current === 'supabase' && remote;
    try {
      await syncOutbox(
        store,
        real
          ? remote.transport(linkUp)
          : mockTransport(ground.current, { ...LINK_FAULTS, linkUp, random }),
        {
          isLinkUp: linkUp,
          check: real ? remote.check : demoGroundCheck(() => ground.current),
          onStatus: s => {
            setStatus(s);
            refresh();
          },
        },
      );
    } finally {
      syncing.current = false;
    }
  }, [store, random, remote, refresh]);

  // Returns the sync promise so tests (and callers) can await it.
  const toggleLink = useCallback(async () => {
    const next: Link = linkRef.current === 'AOS' ? 'LOS' : 'AOS';
    linkRef.current = next;
    setLink(next);
    if (next === 'AOS') await sync();
  }, [sync]);

  // Demo only, LOS only: writes a 5,000-item backlog of simulated readings.
  const fillBacklog = useCallback(
    async (crewId: string) => {
      if (linkRef.current !== 'LOS' || fillingRef.current) return; // ref: blocks a fast double tap
      fillingRef.current = true;
      setFilling(true);
      setStatus({ phase: 'idle' });
      try {
        const runId = Date.now().toString(36);
        await fillOutbox(store, backlogEntries(BACKLOG_SIZE, crewId, runId), {
          onProgress: refresh,
        });
      } finally {
        fillingRef.current = false;
        setFilling(false);
        refresh();
      }
    },
    [store, refresh],
  );

  // LOS only, so a running sync never switches ground halfway.
  const selectGround = useCallback(
    (mode: GroundMode) => {
      if (linkRef.current !== 'LOS' || fillingRef.current || syncing.current)
        return;
      if (mode === 'supabase' && !remote) return;
      groundRef.current = mode;
      setGroundMode(mode);
      setStatus({ phase: 'idle' });
    },
    [remote],
  );

  // Demo only, LOS only: empties the outbox and the demo ground so the demo can run again.
  // The Supabase log is append-only and is never touched from the phone.
  const resetDemo = useCallback(() => {
    if (linkRef.current !== 'LOS' || fillingRef.current) return;
    clearOutbox(store);
    ground.current = new MockGroundStore();
    setStatus({ phase: 'idle' });
    setResetEpoch(e => e + 1);
    refresh();
  }, [store, refresh]);

  const demoAllowed = link === 'LOS' && !filling;
  return {
    link,
    outbox,
    status,
    filling,
    canFill: demoAllowed,
    canReset: demoAllowed,
    ground: groundMode,
    hasRemote: Boolean(remote),
    canSwitchGround: demoAllowed && Boolean(remote),
    resetEpoch,
    groundRows: () => ground.current.size(),
    toggleLink,
    fillBacklog,
    resetDemo,
    selectGround,
    refresh,
  };
}

export type LinkPanelController = ReturnType<typeof useLinkPanel>;
