import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UplinkNote } from '@somacast/core';
import type { GroundContact } from '../../link/model/linkPanel';
import { fetchUplinkNotes } from '../model/uplinkNotes';

export type GroundNotes = {
  notes: UplinkNote[]; // newest first; kept through LOS
  phase: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
};

// Controller: notes from the ground arrive with the link. After every AOS that reached Supabase,
// fetch this crew's uplink notes. The demo ground has no notes, so nothing is fetched there.
export function useGroundNotes(
  client: SupabaseClient | null,
  crewId: string | undefined,
  contact: GroundContact | null,
  fetchNotes: typeof fetchUplinkNotes = fetchUplinkNotes,
): GroundNotes {
  const [state, setState] = useState<GroundNotes>({
    notes: [],
    phase: 'idle',
    error: null,
  });

  useEffect(() => {
    if (!client || !crewId || !contact || contact.ground !== 'supabase') return;
    let alive = true;
    setState(s => ({ ...s, phase: 'loading', error: null }));
    fetchNotes(client, crewId)
      .then(notes => alive && setState({ notes, phase: 'ready', error: null }))
      .catch(
        e =>
          alive &&
          setState(s => ({
            ...s,
            phase: 'error',
            error: e instanceof Error ? e.message : String(e),
          })),
      );
    return () => {
      alive = false;
    };
  }, [client, crewId, contact, fetchNotes]);

  return state;
}
