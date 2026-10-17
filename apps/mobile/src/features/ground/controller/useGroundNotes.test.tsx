import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UplinkNote } from '@somacast/core';
import type { GroundContact } from '../../link/model/linkPanel';
import { GroundNotes } from '../view/GroundNotes';
import { useGroundNotes, type GroundNotes as State } from './useGroundNotes';

const client = {} as SupabaseClient; // never touched: fetchNotes is replaced below
const note: UplinkNote = {
  id: 'n1',
  crewId: 'C2',
  createdAt: '2026-10-17T14:10:00.000Z',
  author: 'Daniel',
  text: 'Saw your sleep trend. Private conference at 15:00?',
};
const contact = (ground: GroundContact['ground']): GroundContact => ({
  losSince: '2026-10-17T14:00:00.000Z',
  aosAt: '2026-10-17T14:05:00.000Z',
  held: 0,
  ground,
  sent: [],
});

async function renderNotes(fetchNotes: jest.Mock, first: GroundContact | null) {
  const ref: { current: State | null } = { current: null };
  function Probe({ c }: { c: GroundContact | null }) {
    ref.current = useGroundNotes(client, 'C2', c, fetchNotes);
    return <GroundNotes state={ref.current} />;
  }
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<Probe c={first} />);
  });
  return {
    get: () => ref.current as State,
    texts: () => tree.root.findAllByType(Text).map(t => t.props.children),
    setContact: (c: GroundContact | null) =>
      ReactTestRenderer.act(async () => {
        tree.update(<Probe c={c} />);
      }),
    tree,
  };
}

describe('useGroundNotes + GroundNotes', () => {
  it('before any AOS: nothing fetched, says notes arrive at the next AOS', async () => {
    const fetchNotes = jest.fn();
    const r = await renderNotes(fetchNotes, null);
    expect(fetchNotes).not.toHaveBeenCalled();
    expect(r.get().phase).toBe('idle');
    expect(r.texts()).toContain(
      'Notes from the flight surgeon arrive at the next AOS.',
    );
  });

  it('AOS on Supabase: fetches and shows each note with author and time', async () => {
    const fetchNotes = jest.fn().mockResolvedValue([note]);
    const r = await renderNotes(fetchNotes, contact('supabase'));
    expect(fetchNotes).toHaveBeenCalledWith(client, 'C2');
    expect(r.get()).toEqual({ notes: [note], phase: 'ready', error: null });
    const texts = r.texts();
    expect(texts).toContain('Daniel');
    expect(texts).toContain('2026-10-17 14:10 UTC');
    expect(texts).toContain(note.text);
    const cards = r.tree.root.findAll(
      n => n.props.testID === 'ground-note' && typeof n.type === 'string',
    );
    expect(cards).toHaveLength(1);
  });

  it('every new AOS fetches again', async () => {
    const fetchNotes = jest.fn().mockResolvedValue([note]);
    const r = await renderNotes(fetchNotes, contact('supabase'));
    await r.setContact(contact('supabase'));
    expect(fetchNotes).toHaveBeenCalledTimes(2);
  });

  it('demo ground: no fetch (the demo ground has no notes)', async () => {
    const fetchNotes = jest.fn();
    await renderNotes(fetchNotes, contact('demo'));
    expect(fetchNotes).not.toHaveBeenCalled();
  });

  it('a failed fetch keeps the notes already shown and says why', async () => {
    const fetchNotes = jest
      .fn()
      .mockResolvedValueOnce([note])
      .mockRejectedValueOnce(new Error('Could not load notes: offline'));
    const r = await renderNotes(fetchNotes, contact('supabase'));
    await r.setContact(contact('supabase'));
    expect(r.get().notes).toEqual([note]);
    expect(r.get().phase).toBe('error');
    expect(r.texts()).toContain('Could not load notes: offline');
  });
});
