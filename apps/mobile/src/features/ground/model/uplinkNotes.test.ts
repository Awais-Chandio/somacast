import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchUplinkNotes, toUplinkNote, type NoteRow } from './uplinkNotes';

const row = (over: Partial<NoteRow> = {}): NoteRow => ({
  id: 'n1',
  crew_id: 'C2',
  text: 'Saw your sleep trend. Let us talk at the 15:00 private conference.',
  created_at: '2026-10-17T14:10:00+00:00',
  author_name: 'Daniel',
  ...over,
});

// The few query-builder calls fetchUplinkNotes makes, recorded so the test can check the filter.
function fakeClient(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  const calls: Array<[string, ...unknown[]]> = [];
  const record =
    <T>(name: string, next: () => T) =>
    (...a: unknown[]): T => {
      calls.push([name, ...a]);
      return next();
    };
  const q: Record<string, unknown> = {};
  q.select = record('select', () => q);
  q.eq = record('eq', () => q);
  q.order = record('order', () => q);
  q.limit = record('limit', () => Promise.resolve(result));
  const client = {
    from: record('from', () => q),
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('uplink notes', () => {
  it('maps a row to a note with the author name and time', () => {
    expect(toUplinkNote(row())).toEqual({
      id: 'n1',
      crewId: 'C2',
      createdAt: '2026-10-17T14:10:00+00:00',
      author: 'Daniel',
      text: 'Saw your sleep trend. Let us talk at the 15:00 private conference.',
    });
  });

  it('no author name stamped: shows "Flight surgeon"', () => {
    expect(toUplinkNote(row({ author_name: null }))?.author).toBe(
      'Flight surgeon',
    );
    expect(toUplinkNote(row({ author_name: '  ' }))?.author).toBe(
      'Flight surgeon',
    );
  });

  it('keeps markup as plain text and drops invalid rows', () => {
    expect(toUplinkNote(row({ text: '<b>hi</b>' }))?.text).toBe('<b>hi</b>');
    expect(toUplinkNote(row({ text: '' }))).toBe(null);
    expect(toUplinkNote(row({ id: null }))).toBe(null);
  });

  it("fetches this crew's notes, newest first", async () => {
    const { client, calls } = fakeClient({
      data: [row(), row({ id: 'bad', text: '' })],
      error: null,
    });
    const notes = await fetchUplinkNotes(client, 'C2');
    expect(notes.map(n => n.id)).toEqual(['n1']);
    expect(calls).toEqual([
      ['from', 'uplink_notes'],
      ['select', 'id, crew_id, text, created_at, author_name'],
      ['eq', 'crew_id', 'C2'],
      ['order', 'created_at', { ascending: false }],
      ['limit', 20],
    ]);
  });

  it('a refused query becomes a readable error', async () => {
    const { client } = fakeClient({
      data: null,
      error: { message: 'JWT expired' },
    });
    await expect(fetchUplinkNotes(client, 'C2')).rejects.toThrow(
      'Could not load notes: JWT expired',
    );
  });
});
