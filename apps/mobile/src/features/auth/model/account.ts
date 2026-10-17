import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ProfileSchema, type Profile } from '@somacast/core';

// Model for sign-in: pure functions plus the two Supabase calls. The hook wires them to state.

export type Account = Profile & { email: string };

// What the profiles table returns (snake_case) mapped to the shared Profile shape.
type ProfileRow = {
  role: unknown;
  crew_id: unknown;
  display_name: unknown;
};

export function toAccount(
  user: Pick<User, 'id' | 'email'>,
  row: ProfileRow,
): Account {
  const parsed = ProfileSchema.safeParse({
    userId: user.id,
    role: row.role,
    crewId: row.crew_id ?? null,
    displayName: row.display_name ?? null,
  });
  if (!parsed.success)
    throw new Error(
      `This account's profile is invalid: ${parsed.error.issues[0]?.message}`,
    );
  return { ...parsed.data, email: user.email ?? '' };
}

// Checked before any network call so the user gets an instant, specific message.
export function signInProblem(email: string, password: string): string | null {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email.';
  if (password.length === 0) return 'Enter your password.';
  return null;
}

// RLS lets each user read only their own profiles row, so no filter is needed; one is added anyway
// to keep the query's intent obvious.
export async function loadAccount(
  client: SupabaseClient,
  user: Pick<User, 'id' | 'email'>,
): Promise<Account> {
  const { data, error } = await client
    .from('profiles')
    .select('role, crew_id, display_name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  if (!data)
    throw new Error(
      'No profile for this account yet. See supabase/seed-users.md.',
    );
  return toAccount(user, data);
}

export async function signInWithPassword(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<Account> {
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.user) throw new Error(error?.message ?? 'Sign-in failed.');
  try {
    return await loadAccount(client, data.user);
  } catch (e) {
    await client.auth.signOut(); // no half-signed-in state without a profile
    throw e;
  }
}

// A crew account can only use the phone if its crew exists in the simulated mission.
export function crewProblem(
  account: Account,
  missionCrewIds: readonly string[],
): string | null {
  if (account.role !== 'crew') return null;
  if (account.crewId && missionCrewIds.includes(account.crewId)) return null;
  return `Crew ${account.crewId} is not part of this simulated mission.`;
}

export function accountLabel(a: Account): string {
  const name = a.displayName ?? a.email;
  return a.role === 'crew'
    ? `${name}, crew ${a.crewId}`
    : `${name}, flight surgeon`;
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
