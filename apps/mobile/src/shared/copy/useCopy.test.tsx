import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { Mode } from '@somacast/core';
import { asyncModeStorage, type ModeStorage } from './modeStorage';
import { CopyProvider, useCopy, type CopyState } from './useCopy';

function memoryStorage(initial: Mode | null = null) {
  let saved = initial;
  return {
    load: jest.fn(async (): Promise<Mode | null> => saved),
    save: jest.fn(async (m: Mode) => {
      saved = m;
    }),
  };
}

async function renderCopy(storage: ModeStorage) {
  const ref: { current: CopyState | null } = { current: null };
  function Probe() {
    ref.current = useCopy();
    return null;
  }
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <CopyProvider storage={storage}>
        <Probe />
      </CopyProvider>,
    );
  });
  return {
    get: () => ref.current as CopyState,
    choose: (m: Mode) =>
      ReactTestRenderer.act(async () => {
        ref.current!.setMode(m);
      }),
  };
}

describe('CopyProvider remembers Space / Earth', () => {
  it('first run: Space; a choice is saved', async () => {
    const storage = memoryStorage();
    const r = await renderCopy(storage);
    expect(r.get().mode).toBe('space');
    await r.choose('earth');
    expect(r.get().mode).toBe('earth');
    expect(r.get().words.linkDown).toBe('Offline');
    expect(storage.save).toHaveBeenCalledWith('earth');
  });

  it('next start: opens in the saved mode', async () => {
    const r = await renderCopy(memoryStorage('earth'));
    expect(r.get().mode).toBe('earth');
  });

  it('a tap before the saved mode loads wins', async () => {
    let resolve!: (m: Mode | null) => void;
    const storage: ModeStorage = {
      load: () => new Promise(res => (resolve = res)),
      save: jest.fn(async () => {}),
    };
    const r = await renderCopy(storage);
    await r.choose('earth');
    await ReactTestRenderer.act(async () => resolve('space'));
    expect(r.get().mode).toBe('earth');
  });

  it('AsyncStorage storage: round trip, and junk is ignored', async () => {
    expect(await asyncModeStorage.load()).toBe(null);
    await asyncModeStorage.save('earth');
    expect(await asyncModeStorage.load()).toBe('earth');
    await asyncModeStorage.save('mars' as Mode);
    expect(await asyncModeStorage.load()).toBe(null);
  });
});
