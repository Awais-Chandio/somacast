import type { SupabaseClient } from '@supabase/supabase-js';
import { UplinkNoteSchema, type UplinkNote } from '@somacast/core';

// Notes the flight surgeon sends up (uplink_notes). RLS lets a crew member read only their own
// crew's notes. author_name is stamped by the database from the author's profile; the phone cannot
// read the surgeon's profile itself.

export const NOTES_TABLE = 'uplink_notes';
export const NOTES_LIMIT = 20;
const FALLBACK_AUTHOR = 'Flight surgeon';

export type NoteRow = {
  id: unknown;
  crew_id: unknown;
  text: unknown;
  created_at: unknown;
  author_name: unknown;
};

// A row that is not a valid note is dropped rather than shown half-broken.
export function toUplinkNote(row: NoteRow): UplinkNote | null {
  const author =
    typeof row.author_name === 'string' && row.author_name.trim()
      ? row.author_name.trim()
      : FALLBACK_AUTHOR;
  const parsed = UplinkNoteSchema.safeParse({
    id: row.id,
    crewId: row.crew_id,
    createdAt: row.created_at,
    author,
    text: row.text,
  });
  return parsed.success ? parsed.data : null;
}

// Newest first. Throws with a readable message so the screen can show it.
export async function fetchUplinkNotes(
  client: SupabaseClient,
  crewId: string,
  limit = NOTES_LIMIT,
): Promise<UplinkNote[]> {
  const { data, error } = await client
    .from(NOTES_TABLE)
    .select('id, crew_id, text, created_at, author_name')
    .eq('crew_id', crewId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load notes: ${error.message}`);
  return ((data ?? []) as NoteRow[])
    .map(toUplinkNote)
    .filter((n): n is UplinkNote => n !== null);
}
