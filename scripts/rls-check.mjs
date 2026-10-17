#!/usr/bin/env node
// RLS proof for the Somacast ground database (Phase 7).
// Uses only the public anon key, exactly like the phone. Signs in as the three demo users from
// supabase/seed-users.md and checks what each one can and cannot do. Prints a PASS/FAIL table and
// exits 1 if anything fails.
//
//   npm run rls-check
//
// Reads SUPABASE_URL / SUPABASE_ANON_KEY from apps/mobile/.env and the demo passwords from
// scripts/.env (MAYA_PASSWORD, DANIEL_PASSWORD, PROBE_PASSWORD). Never uses the service-role key.
//
// Every write it makes or attempts targets the test crew ZZ-TEST (the probe account), never a real
// crew: at most one ZZ-TEST log row ever (stable key, insert-if-missing) and one ZZ-TEST uplink note
// per run, labelled as an RLS probe. The ground console hides every crew whose id starts with ZZ-.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['apps/mobile/.env', 'scripts/.env']) {
  const p = join(root, f);
  if (existsSync(p)) process.loadEnvFile(p);
}

const { SUPABASE_URL, SUPABASE_ANON_KEY, MAYA_PASSWORD, DANIEL_PASSWORD, PROBE_PASSWORD } =
  process.env;
const missing = Object.entries({
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  MAYA_PASSWORD,
  DANIEL_PASSWORD,
  PROBE_PASSWORD,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(
    `Missing ${missing.join(', ')}. See apps/mobile/.env.example, scripts/.env.example and supabase/seed-users.md.`,
  );
  process.exit(2);
}

const MAYA = { email: 'maya@somacast.test', password: MAYA_PASSWORD };
const DANIEL = { email: 'daniel@somacast.test', password: DANIEL_PASSWORD };
const PROBE = { email: 'probe@somacast.test', password: PROBE_PASSWORD };
const TEST_CREW = 'ZZ-TEST';
const PROBE_KEY = `${TEST_CREW}:crew_action:rls-check-probe`;

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
const probe = await signIn(PROBE);
const anon = newClient();

// Probe = a crew member of ZZ-TEST. It writes the only log row this script ever stores.
let target = null;
await check('Probe', 'insert own crew (ZZ-TEST) row', async () => {
  const { data, error } = await probe.c.from('log_entries').select('key, kind').eq('key', PROBE_KEY);
  if (error) throw new Error(error.message);
  if (data.length) {
    target = data[0];
    return { pass: true, detail: `${PROBE_KEY} already stored (earlier run)` };
  }
  const r = await probe.c.from('log_entries').insert(row(PROBE_KEY, TEST_CREW));
  if (r.error) return { pass: false, detail: r.error.message };
  target = { key: PROBE_KEY, kind: 'crew_action' };
  return { pass: true, detail: `inserted ${PROBE_KEY}` };
});

await check('Probe', 'update own row is refused', async () => {
  const r = await probe.c
    .from('log_entries')
    .update({ kind: 'tampered' })
    .eq('key', target.key)
    .select('key');
  const after = await probe.c.from('log_entries').select('kind').eq('key', target.key).single();
  const unchanged = after.data?.kind === target.kind;
  return { pass: blocked(r) && unchanged, detail: `${why(r)}; row ${unchanged ? 'unchanged' : 'CHANGED'}` };
});

await check('Probe', 'delete own row is refused', async () => {
  const r = await probe.c.from('log_entries').delete().eq('key', target.key).select('key');
  const after = await probe.c.from('log_entries').select('key').eq('key', target.key);
  const still = after.data?.length === 1;
  return { pass: blocked(r) && still, detail: `${why(r)}; row ${still ? 'still there' : 'GONE'}` };
});

await check('Probe', 'resending a stored key adds no row', async () => {
  const before = await countRows(probe.c, TEST_CREW);
  const { data: full } = await probe.c
    .from('log_entries')
    .select('key, crew_id, kind, ts, payload')
    .eq('key', target.key)
    .single();
  const r = await probe.c
    .from('log_entries')
    .upsert(full, { onConflict: 'key', ignoreDuplicates: true });
  const after = await countRows(probe.c, TEST_CREW);
  return {
    pass: !r.error && after === before,
    detail: r.error ? r.error.message : `${TEST_CREW} rows ${before} -> ${after}`,
  };
});

await check('Probe', 'insert uplink note is refused', async () => {
  const r = await probe.c.from('uplink_notes').insert({ crew_id: TEST_CREW, text: 'forged note' });
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

// Maya = a crew member of C1. Her probes aim at ZZ-TEST and must all be refused or read nothing.
const testRows = await countRows(daniel.c, TEST_CREW); // the surgeon sees every crew

await check('Maya', 'insert ZZ-TEST row is refused', async () => {
  const r = await maya.c
    .from('log_entries')
    .insert(row(`${TEST_CREW}:crew_action:rls-forged-${Date.now()}`, TEST_CREW));
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

await check('Maya', 'upsert onto the ZZ-TEST probe key is refused', async () => {
  const r = await maya.c
    .from('log_entries')
    .upsert(row(PROBE_KEY, TEST_CREW), { onConflict: 'key', ignoreDuplicates: true });
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

await check('Maya', 'read ZZ-TEST rows returns 0', async () => {
  const n = await countRows(maya.c, TEST_CREW);
  return { pass: n === 0 && testRows > 0, detail: `Maya sees ${n}; Daniel sees ${testRows} ZZ-TEST row(s)` };
});

await check('Maya', 'profiles shows only her own row', async () => {
  const { data, error } = await maya.c.from('profiles').select('user_id, role, crew_id');
  if (error) throw new Error(error.message);
  const ok = data.length === 1 && data[0].user_id === maya.user.id && data[0].crew_id === 'C1';
  return { pass: ok, detail: `${data.length} row(s): ${data.map(p => `${p.role}/${p.crew_id}`).join(', ')}` };
});

await check('Maya', 'insert ZZ-TEST uplink note is refused', async () => {
  const r = await maya.c.from('uplink_notes').insert({ crew_id: TEST_CREW, text: 'forged note' });
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

// ---------------------------------------------------------------------------
await check('Daniel', 'reads ZZ-TEST rows', async () => {
  const n = await countRows(daniel.c, TEST_CREW);
  return { pass: n > 0, detail: `${n} ZZ-TEST row(s)` };
});

await check('Daniel', 'insert log row is refused (read only)', async () => {
  const r = await daniel.c
    .from('log_entries')
    .insert(row(`${TEST_CREW}:crew_action:rls-surgeon-${Date.now()}`, TEST_CREW));
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

let noteId = null;
await check('Daniel', 'insert uplink note for ZZ-TEST', async () => {
  const { data, error } = await daniel.c
    .from('uplink_notes')
    .insert({ crew_id: TEST_CREW, author: daniel.user.id, text: 'RLS check probe (not a medical note)' })
    .select('id')
    .single();
  if (error) return { pass: false, detail: error.message };
  noteId = data.id;
  return { pass: true, detail: `note ${noteId}` };
});

await check('Daniel', 'note signed as someone else is refused', async () => {
  const r = await daniel.c
    .from('uplink_notes')
    .insert({ crew_id: TEST_CREW, author: probe.user.id, text: 'forged author' });
  return { pass: Boolean(r.error), detail: r.error ? `refused: ${r.error.message}` : 'ACCEPTED' };
});

await check('Probe', 'reads the uplink note for its crew', async () => {
  const { data, error } = await probe.c.from('uplink_notes').select('id, crew_id').eq('id', noteId);
  if (error) throw new Error(error.message);
  return { pass: data.length === 1, detail: `${data.length} row(s)` };
});

await check('Maya', 'reads no ZZ-TEST uplink notes', async () => {
  const { data, error } = await maya.c.from('uplink_notes').select('id').eq('crew_id', TEST_CREW);
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
await probe.c.auth.signOut();

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
