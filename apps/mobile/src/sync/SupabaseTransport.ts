import type { SupabaseClient } from '@supabase/supabase-js';
import type { OutboxItem, Transport } from '@somacast/core';

// The real ground link (Phase 7): sends outbox batches to Supabase's log_entries table.
//
// Idempotent: the row key is the outbox idempotency key, and the upsert is
// INSERT ... ON CONFLICT (key) DO NOTHING. A batch sent twice (lost ack, retry) is stored once.
// Atomic: one batch = one request = one statement. If any row is refused (e.g. RLS: wrong crew),
// nothing in the batch is stored and nothing is acked, so the whole batch stays in the outbox.

export const LOG_TABLE = 'log_entries';

export type LogRow = {
  key: string;
  crew_id: string;
  kind: string;
  ts: string;
  payload: Record<string, unknown>;
};

export function toLogRow(item: OutboxItem): LogRow {
  return {
    key: item.key,
    crew_id: item.entry.crewId,
    kind: item.entry.kind,
    ts: item.entry.timestamp,
    payload: item.entry.payload,
  };
}

export function createSupabaseTransport(
  client: SupabaseClient,
  opts: { linkUp: () => boolean },
): Transport {
  return async batch => {
    // The LOS/AOS toggle simulates the blackout; real network errors surface below.
    if (!opts.linkUp()) throw new Error('LOS: no link');
    if (batch.length === 0) return { acked: [] };
    const { error } = await client
      .from(LOG_TABLE)
      .upsert(batch.map(toLogRow), {
        onConflict: 'key',
        ignoreDuplicates: true,
      });
    if (error) throw new Error(`Ground refused batch: ${error.message}`);
    return { acked: batch.map(b => b.key) }; // only reached when the upsert succeeded
  };
}

// Duplicate check after a sync: rows vs distinct keys for one crew, via the log_counts SQL
// function (security invoker, so RLS limits a crew member to their own crew).
export type GroundCounts = { rows: number; duplicates: number };

export async function supabaseGroundCounts(
  client: SupabaseClient,
  crewId: string,
): Promise<GroundCounts> {
  const { data, error } = await client.rpc('log_counts', { p_crew_id: crewId });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { total?: number | string; distinct_keys?: number | string }
    | undefined;
  const rows = Number(row?.total ?? 0); // bigint arrives as a number or a string
  const distinct = Number(row?.distinct_keys ?? 0);
  return { rows, duplicates: rows - distinct };
}
