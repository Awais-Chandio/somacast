import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MemoryOutboxStore,
  enqueue,
  flushOutbox,
  type LogEntry,
} from '@somacast/core';
import {
  createSupabaseTransport,
  supabaseGroundCounts,
  toLogRow,
} from './SupabaseTransport';

// A fake supabase-js client: records every upsert and answers like PostgREST would.
// The real database and its RLS are exercised by scripts/rls-check.mjs, not here.
function fakeClient(
  answer: { error: { message: string } | null } = { error: null },
  rpc: { data: unknown; error: { message: string } | null } = {
    data: [],
    error: null,
  },
) {
  const calls: Array<{ table: string; rows: unknown[]; options: unknown }> = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];
  const client = {
    from: (table: string) => ({
      upsert: async (rows: unknown[], options: unknown) => {
        calls.push({ table, rows, options });
        return answer;
      },
    }),
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return rpc;
    },
  } as unknown as SupabaseClient;
  return { client, calls, rpcCalls };
}

function entries(n: number): LogEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    crewId: 'C1',
    timestamp: '2027-02-14T00:00:00.000Z',
    kind: 'reading' as const,
    payload: { simulated: true, n: i },
  }));
}

function filled(n: number) {
  const store = new MemoryOutboxStore();
  for (const e of entries(n)) enqueue(store, e);
  return store;
}

describe('SupabaseTransport', () => {
  it('maps an outbox item to a log_entries row keyed by the idempotency key', () => {
    const [item] = filled(1).pending(1);
    expect(toLogRow(item!)).toEqual({
      key: 'C1:reading:e0',
      crew_id: 'C1',
      kind: 'reading',
      ts: '2027-02-14T00:00:00.000Z',
      payload: { simulated: true, n: 0 },
    });
  });

  it('upserts each batch with ON CONFLICT (key) DO NOTHING and acks every key', async () => {
    const { client, calls } = fakeClient();
    const store = filled(450);
    const r = await flushOutbox(
      store,
      createSupabaseTransport(client, { linkUp: () => true }),
      { batchSize: 200 },
    );
    expect(r).toMatchObject({ sentBatches: 3, acked: 450, remaining: 0 });
    expect(calls.map(c => c.rows.length)).toEqual([200, 200, 50]);
    for (const c of calls) {
      expect(c.table).toBe('log_entries');
      expect(c.options).toEqual({ onConflict: 'key', ignoreDuplicates: true });
    }
  });

  it('a refused upsert acks nothing: the batch stays in the outbox', async () => {
    const { client } = fakeClient({
      error: { message: 'new row violates row-level security policy' },
    });
    const store = filled(10);
    const r = await flushOutbox(
      store,
      createSupabaseTransport(client, { linkUp: () => true }),
      { maxBatches: 1 },
    );
    expect(r.acked).toBe(0);
    expect(r.failedBatches).toBe(1);
    expect(r.lastError).toBe(
      'Ground refused batch: new row violates row-level security policy',
    );
    expect(store.pendingCount()).toBe(10);
  });

  it('in LOS nothing is sent at all', async () => {
    const { client, calls } = fakeClient();
    const store = filled(5);
    await flushOutbox(
      store,
      createSupabaseTransport(client, { linkUp: () => false }),
      { maxBatches: 2 },
    );
    expect(calls).toHaveLength(0);
    expect(store.pendingCount()).toBe(5);
  });

  it('ground counts: rows and rows beyond distinct keys, bigint as string', async () => {
    const { client, rpcCalls } = fakeClient(undefined, {
      data: [{ total: '5001', distinct_keys: '5001' }],
      error: null,
    });
    await expect(supabaseGroundCounts(client, 'C1')).resolves.toEqual({
      rows: 5001,
      duplicates: 0,
    });
    expect(rpcCalls).toEqual([{ fn: 'log_counts', args: { p_crew_id: 'C1' } }]);
  });

  it('ground counts: an RPC error is thrown, not reported as 0 rows', async () => {
    const { client } = fakeClient(undefined, {
      data: null,
      error: { message: 'permission denied' },
    });
    await expect(supabaseGroundCounts(client, 'C1')).rejects.toThrow(
      'permission denied',
    );
  });
});
