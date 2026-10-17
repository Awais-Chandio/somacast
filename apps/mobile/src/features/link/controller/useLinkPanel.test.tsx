import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { MemoryOutboxStore, createRng } from '@somacast/core';
import { useLinkPanel, type LinkPanelController } from './useLinkPanel';

async function renderPanel(store = new MemoryOutboxStore()) {
  const ref: { current: LinkPanelController | null } = { current: null };
  const random = createRng(11).next; // seeded link faults: same run every time
  function Probe() {
    ref.current = useLinkPanel(store, { random });
    return null;
  }
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Probe />);
  });
  return () => ref.current as LinkPanelController;
}

const act = (fn: () => Promise<void>) => ReactTestRenderer.act(fn);

describe('useLinkPanel', () => {
  it('starts in LOS with the stored count', async () => {
    const store = new MemoryOutboxStore();
    store.add({
      key: 'k1',
      entry: {
        id: 'x',
        crewId: 'C1',
        timestamp: '2027-01-01T00:00:00.000Z',
        kind: 'reading',
        payload: {},
      },
      attempts: 0,
    });
    const p = await renderPanel(store);
    expect(p().link).toBe('LOS');
    expect(p().pending).toBe(1);
    expect(p().status).toEqual({ phase: 'idle' });
  });

  it('LOS: fill backlog -> 5,000 waiting; AOS: syncs to 5,000 ground rows', async () => {
    const p = await renderPanel();
    await act(() => p().fillBacklog('C1'));
    expect(p().pending).toBe(5000);

    await act(() => p().toggleLink());
    expect(p().link).toBe('AOS');
    expect(p().status).toEqual({ phase: 'synced', groundRows: 5000 });
    expect(p().pending).toBe(0);
    expect(p().groundRows()).toBe(5000);
  });

  it('fill does nothing in AOS', async () => {
    const p = await renderPanel();
    await act(() => p().toggleLink());
    expect(p().canFill).toBe(false);
    await act(() => p().fillBacklog('C1'));
    expect(p().pending).toBe(0);
  });
});
