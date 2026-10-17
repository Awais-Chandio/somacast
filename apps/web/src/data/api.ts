import type { SupabaseClient } from '@supabase/supabase-js';
import { isTestCrew, type IndexRow, type ReadingRow } from './ground';

// The console's Supabase calls. RLS lets a flight surgeon read every crew's log and notes, and
// insert notes signed with their own id; nothing here can edit or delete the log.

const PAGE = 1000; // Supabase returns at most 1,000 rows per request (config.toml max_rows)

// Reads every page of a query. order() must be stable so pages never overlap or skip rows.
async function allPages<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

// Every row's crew and arrival time: enough for the crew cards and the LOS timeline.
export function fetchIndex(
  client: SupabaseClient,
  crewId?: string,
): Promise<IndexRow[]> {
  return allPages<IndexRow>((from, to) => {
    let q = client
      .from('log_entries')
      .select('crew_id, received_at')
      .not('crew_id', 'like', 'ZZ-%');
    if (crewId) q = q.eq('crew_id', crewId);
    return q.order('received_at').order('key').range(from, to);
  });
}

// Daily readings only: the demo backlog (payload.demoBacklog) is left on the server.
export function fetchReadings(
  client: SupabaseClient,
  crewId?: string,
): Promise<ReadingRow[]> {
  return allPages<ReadingRow>((from, to) => {
    let q = client
      .from('log_entries')
      .select('key, crew_id, received_at, payload')
      .eq('kind', 'reading')
      .is('payload->>demoBacklog', null)
      .not('crew_id', 'like', 'ZZ-%');
    if (crewId) q = q.eq('crew_id', crewId);
    return q.order('received_at').order('key').range(from, to);
  });
}

export type Note = {
  id: string;
  crew_id: string;
  text: string;
  created_at: string;
};

export async function fetchNotes(
  client: SupabaseClient,
  crewId: string,
): Promise<Note[]> {
  const { data, error } = await client
    .from('uplink_notes')
    .select('id, crew_id, text, created_at')
    .eq('crew_id', crewId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// author must be the signed-in surgeon (RLS refuses any other id).
export async function sendNote(
  client: SupabaseClient,
  crewId: string,
  authorId: string,
  text: string,
): Promise<Note> {
  if (isTestCrew(crewId))
    throw new Error('Test crews do not receive notes from the console.');
  const { data, error } = await client
    .from('uplink_notes')
    .insert({ crew_id: crewId, author: authorId, text })
    .select('id, crew_id, text, created_at')
    .single();
  if (error) throw new Error(`Note not sent: ${error.message}`);
  return data;
}

export type Role = 'crew' | 'surgeon';
export type Me = {
  userId: string;
  email: string;
  role: Role;
  displayName: string | null;
};

// Each user can read only their own profiles row.
export async function fetchMe(client: SupabaseClient): Promise<Me | null> {
  const { data: u } = await client.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await client
    .from('profiles')
    .select('role, display_name')
    .eq('user_id', u.user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  if (!data)
    throw new Error(
      'No profile for this account yet. See supabase/seed-users.md.',
    );
  if (data.role !== 'crew' && data.role !== 'surgeon')
    throw new Error('This account has an unknown role.');
  return {
    userId: u.user.id,
    email: u.user.email ?? '',
    role: data.role,
    displayName: data.display_name,
  };
}
