#!/usr/bin/env node
// RLS proof for the Somacast ground database (Phase 7).
// Uses only the public anon key, exactly like the phone. Signs in as the two demo users from
// supabase/seed-users.md and checks what each one can and cannot do. Prints a PASS/FAIL table and
// exits 1 if anything fails.
//
//   npm run rls-check
//
// Reads SUPABASE_URL / SUPABASE_ANON_KEY from apps/mobile/.env and the demo passwords from
// scripts/.env (MAYA_PASSWORD, DANIEL_PASSWORD). Never uses the service-role key.
//
// Writes it makes on purpose: at most one C1 probe row (only if Maya's crew has no rows yet, stable
// key, so never more than one) and one uplink note per run, labelled as an RLS probe.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['apps/mobile/.env', 'scripts/.env']) {
  const p = join(root, f);
  if (existsSync(p)) process.loadEnvFile(p);
}

const { SUPABASE_URL, SUPABASE_ANON_KEY, MAYA_PASSWORD, DANIEL_PASSWORD } =
  process.env;
const missing = Object.entries({
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  MAYA_PASSWORD,
  DANIEL_PASSWORD,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(
    `Missing ${missing.join(', ')}. See apps/mobile/.env.example and scripts/.env.example.`,
  );
  process.exit(2);
}

const MAYA = { email: 'maya@somacast.test', password: MAYA_PASSWORD };
const DANIEL = { email: 'daniel@somacast.test', password: DANIEL_PASSWORD };
const PROBE_KEY = 'C1:crew_action:rls-check-probe';

// A fresh client per user: no shared session, nothing saved to disk.
const newClient = () =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function signIn({ email, password }) {
  const c = newClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { c, user: data.user };
}

const row = (key, crew) => ({
  key,
  crew_id: crew,
  kind: 'crew_action',
  ts: new Date().toISOString(),
  payload: { simulated: true, probe: 'rls-check' },
});

async function countRows(c, crew) {
  const { count, error } = await c
    .from('log_entries')
    .select('key', { count: 'exact', head: true })
    .eq('crew_id', crew);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// A write is "blocked" if Postgres refuses it, or if RLS filters it down to 0 rows.
const blocked = ({ error, data }) =>
  Boolean(error) || (Array.isArray(data) && data.length === 0);
const why = ({ error, data }) =>
  error ? `refused: ${error.message}` : `${data?.length ?? 0} rows affected`;

const results = [];
async function check(who, name, fn) {
  try {
    const { pass, detail } = await fn();
    results.push({ who, name, result: pass ? 'PASS' : 'FAIL', detail });
  } catch (e) {
    results.push({ who, name, result: 'FAIL', detail: `error: ${e.message}` });
  }
}

// ---------------------------------------------------------------------------
const maya = await signIn(MAYA);
const daniel = await signIn(DANIEL);
const anon = newClient();

// Daniel (surgeon) sees every crew, so he tells us whether a C2 row really exists.
const c2Exists = await countRows(daniel.c, 'C2');

// Maya's own-crew row to aim update/delete at: any existing C1 row, else the probe row.
let target = null;
await check('Maya', 'insert own crew (C1) row', async () => {
  const { data, error } = await maya.c
    .from('log_entries')
    .select('key, kind')
    .eq('crew_id', 'C1')
    .limit(1);
  if (error) throw new Error(error.message);
  if (data.length) {
    target = data[0];
    return { pass: true, detail: `C1 already has rows (by app sync); using ${target.key}` };
  }
  const r = await maya.c.from('log_entries').insert(row(PROBE_KEY, 'C1'));
  if (r.error) return { pass: false, detail: r.error.message };
  target = { key: PROBE_KEY, kind: 'crew_action' };
  return { pass: true, detail: `inserted ${PROBE_KEY}` };
});

await check('Maya', 'insert C2 row is refused', async () => {
  const r = await maya.c
    .from('log_entries')
    .insert(row(`C2:crew_action:rls-forged-${Date.now()}`, 'C2'));
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

await check('Maya', 'upsert onto a C2 key is refused', async () => {
  const r = await maya.c
    .from('log_entries')
    .upsert(row('C2:reading:rls-fixture', 'C2'), { onConflict: 'key', ignoreDuplicates: true });
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

await check('Maya', 'read C2 rows returns 0', async () => {
  const n = await countRows(maya.c, 'C2');
  return {
    pass: n === 0,
    detail: `Maya sees ${n}; Daniel sees ${c2Exists} C2 row(s)${c2Exists ? '' : ' (add the C2 fixture for a stronger proof)'}`,
  };
});

await check('Maya', 'update own row is refused', async () => {
  const r = await maya.c
    .from('log_entries')
    .update({ kind: 'tampered' })
    .eq('key', target.key)
    .select('key');
  const after = await maya.c.from('log_entries').select('kind').eq('key', target.key).single();
  const unchanged = after.data?.kind === target.kind;
  return { pass: blocked(r) && unchanged, detail: `${why(r)}; row ${unchanged ? 'unchanged' : 'CHANGED'}` };
});

await check('Maya', 'delete own row is refused', async () => {
  const r = await maya.c.from('log_entries').delete().eq('key', target.key).select('key');
  const after = await maya.c.from('log_entries').select('key').eq('key', target.key);
  const still = after.data?.length === 1;
  return { pass: blocked(r) && still, detail: `${why(r)}; row ${still ? 'still there' : 'GONE'}` };
});

await check('Maya', 'resending a stored key adds no row', async () => {
  const before = await countRows(maya.c, 'C1');
  const { data: full } = await maya.c
    .from('log_entries')
    .select('key, crew_id, kind, ts, payload')
    .eq('key', target.key)
    .single();
  const r = await maya.c
    .from('log_entries')
    .upsert(full, { onConflict: 'key', ignoreDuplicates: true });
  const after = await countRows(maya.c, 'C1');
  return {
    pass: !r.error && after === before,
    detail: r.error ? r.error.message : `C1 rows ${before} -> ${after}`,
  };
});

await check('Maya', 'profiles shows only her own row', async () => {
  const { data, error } = await maya.c.from('profiles').select('user_id, role, crew_id');
  if (error) throw new Error(error.message);
  const ok = data.length === 1 && data[0].user_id === maya.user.id && data[0].crew_id === 'C1';
  return { pass: ok, detail: `${data.length} row(s): ${data.map(p => `${p.role}/${p.crew_id}`).join(', ')}` };
});

await check('Maya', 'insert uplink note is refused', async () => {
  const r = await maya.c.from('uplink_notes').insert({ crew_id: 'C1', text: 'forged note' });
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

// ---------------------------------------------------------------------------
await check('Daniel', 'reads C1 rows', async () => {
  const n = await countRows(daniel.c, 'C1');
  return { pass: n > 0, detail: `${n} C1 row(s)` };
});

await check('Daniel', 'insert log row is refused (read only)', async () => {
  const r = await daniel.c
    .from('log_entries')
    .insert(row(`C1:crew_action:rls-surgeon-${Date.now()}`, 'C1'));
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

let noteId = null;
await check('Daniel', 'insert uplink note for C1', async () => {
  const { data, error } = await daniel.c
    .from('uplink_notes')
    .insert({ crew_id: 'C1', author: daniel.user.id, text: 'RLS check probe (not a medical note)' })
    .select('id')
    .single();
  if (error) return { pass: false, detail: error.message };
  noteId = data.id;
  return { pass: true, detail: `note ${noteId}` };
});

await check('Daniel', 'note signed as someone else is refused', async () => {
  const r = await daniel.c
    .from('uplink_notes')
    .insert({ crew_id: 'C1', author: maya.user.id, text: 'forged author' });
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

await check('Maya', 'reads the uplink note for her crew', async () => {
  const { data, error } = await maya.c.from('uplink_notes').select('id, crew_id').eq('id', noteId);
  if (error) throw new Error(error.message);
  return { pass: data.length === 1, detail: `${data.length} row(s)` };
});

await check('Maya', 'reads no uplink notes for C2', async () => {
  const { data, error } = await maya.c.from('uplink_notes').select('id').eq('crew_id', 'C2');
  if (error) throw new Error(error.message);
  return { pass: data.length === 0, detail: `${data.length} row(s)` };
});

// ---------------------------------------------------------------------------
await check('anon', 'logged-out read of log_entries gets nothing', async () => {
  const r = await anon.from('log_entries').select('key').limit(1);
  return { pass: blocked(r), detail: why(r) };
});

await maya.c.auth.signOut();
await daniel.c.auth.signOut();

// ---------------------------------------------------------------------------
const w = k => Math.max(k.length, ...results.map(r => String(r[k]).length));
const cols = ['result', 'who', 'name', 'detail'];
const widths = Object.fromEntries(cols.map(k => [k, Math.min(w(k), k === 'detail' ? 90 : 60)]));
const line = r => cols.map(k => String(r[k]).slice(0, widths[k]).padEnd(widths[k])).join(' | ');
console.log(line({ result: 'RESULT', who: 'WHO', name: 'CHECK', detail: 'DETAIL' }));
console.log(cols.map(k => '-'.repeat(widths[k])).join('-|-'));
for (const r of results) console.log(line(r));
const failed = results.filter(r => r.result === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} PASS${failed ? `, ${failed} FAIL` : ''}`);
process.exit(failed ? 1 : 0);
