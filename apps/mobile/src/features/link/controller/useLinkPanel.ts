import { useCallback, useMemo, useRef, useState } from 'react';
import { MockGroundStore, mockTransport } from '@somacast/core';
import {
  BACKLOG_SIZE,
  backlogEntries,
  fillOutbox,
  syncOutbox,
  type Link,
  type LocalOutbox,
  type SyncStatus,
} from '../model/linkPanel';

// Demo radio link: 10% of batches lost on the way up, 10% of acknowledgements lost on the way down.
const LINK_FAULTS = { failRate: 0.1, lostAckRate: 0.1 };

// Controller: link state, outbox count and sync progress. The sending logic lives in the model.
// The ground side is an in-memory MockGroundStore until Phase 7 (Supabase).
export function useLinkPanel(
  store: LocalOutbox,
  opts: { random?: () => number } = {},
) {
  const [link, setLink] = useState<Link>('LOS'); // the app always starts in LOS
  const linkRef = useRef<Link>('LOS');
  const [pending, setPending] = useState(() => store.pendingCount());
  const [status, setStatus] = useState<SyncStatus>({ phase: 'idle' });
  const [filling, setFilling] = useState(false);
  const fillingRef = useRef(false);
  const syncing = useRef(false);
  const [ground] = useState(() => new MockGroundStore());

  const transport = useMemo(
    () =>
      mockTransport(ground, {
        ...LINK_FAULTS,
        linkUp: () => linkRef.current === 'AOS',
        random: opts.random,
      }),
    [ground, opts.random],
  );

  const refresh = useCallback(() => setPending(store.pendingCount()), [store]);

  const sync = useCallback(async () => {
    if (syncing.current) return; // the running sync keeps going while the link is up
    syncing.current = true;
    try {
      await syncOutbox(store, transport, {
        isLinkUp: () => linkRef.current === 'AOS',
        groundRows: () => ground.size(),
        onStatus: s => {
          setStatus(s);
          refresh();
        },
      });
    } finally {
      syncing.current = false;
    }
  }, [store, transport, ground, refresh]);

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

  return {
    link,
    pending,
    status,
    filling,
    canFill: link === 'LOS' && !filling,
    groundRows: () => ground.size(),
    toggleLink,
    fillBacklog,
    refresh,
  };
}

export type LinkPanelController = ReturnType<typeof useLinkPanel>;
