// Which ground each signed-in account picked on the link panel, keyed by user id.
// Kept in memory only, never on disk: every app launch and every fresh sign-in starts on Supabase.
// A remount of the same signed-in account (for example a Fast Refresh) keeps its choice, and one
// account's Demo choice never leaks into another account.

export type GroundMode = 'supabase' | 'demo';

const choices = new Map<string, GroundMode>();

// Signed in: the stored choice, or Supabase. Never Demo by default.
export function groundChoiceFor(accountId: string): GroundMode {
  return choices.get(accountId) ?? 'supabase';
}

export function rememberGroundChoice(accountId: string, mode: GroundMode) {
  if (mode === 'supabase') choices.delete(accountId);
  else choices.set(accountId, mode);
}

// Called on sign-in, so a new session always starts on Supabase.
export function forgetGroundChoice(accountId: string) {
  choices.delete(accountId);
}
