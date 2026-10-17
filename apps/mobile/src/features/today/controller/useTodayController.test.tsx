import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { MemoryOutboxStore } from '@somacast/core';
import { useTodayController, type TodayController } from './useTodayController';

// Renders the hook inside a tiny component and keeps the latest result.
async function renderController(outbox = new MemoryOutboxStore(), epoch = 0) {
  const ref: { current: TodayController | null } = { current: null };
  function Probe({ logEpoch }: { logEpoch: number }) {
    ref.current = useTodayController(outbox, undefined, logEpoch);
    return null;
  }
  let root: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    root = ReactTestRenderer.create(<Probe logEpoch={epoch} />);
  });
  const get = () => ref.current as TodayController;
  // Re-renders with a new log epoch, as a demo reset does.
  get.setEpoch = (logEpoch: number) =>
    ReactTestRenderer.act(() => {
      root!.update(<Probe logEpoch={logEpoch} />);
    });
  return get;
}

const act = (fn: () => void) => ReactTestRenderer.act(async () => fn());

describe('useTodayController', () => {
  it('starts on the last mission day for C1 in the normal scenario', async () => {
    const c = await renderController();
    expect(c().crewId).toBe('C1');
    expect(c().scenario).toBe('normal');
    expect(c().day).toBe(c().maxDay);
    expect(c().crew.map(m => m.id)).toEqual(['C1', 'C2', 'C3', 'C4']);
    expect(c().view.crewName).toBe('Maya');
  });

  it('day stays inside 0..maxDay', async () => {
    const c = await renderController();
    await act(() => c().nextDay());
    expect(c().day).toBe(c().maxDay);
    await act(() => c().prevDay());
    expect(c().day).toBe(c().maxDay - 1);
  });

  it('blackout scenario, Kenji, day 75 reaches Storm', async () => {
    const c = await renderController();
    await act(() => c().selectScenario('blackoutDecline'));
    await act(() => c().selectCrew('C2'));
    while (c().day > 75) {
      await act(() => c().prevDay());
    }
    expect(c().view.crewName).toBe('Kenji');
    expect(c().view.state).toBe('storm');
  });

  it('black box: each shown day is logged once, revisiting adds nothing', async () => {
    const outbox = new MemoryOutboxStore();
    const c = await renderController(outbox);
    const first = outbox.pendingCount();
    expect(first).toBeGreaterThanOrEqual(1); // at least the day's reading
    expect(outbox.has(`C1:reading:normal-C1-${c().maxDay}-reading`)).toBe(true);

    await act(() => c().prevDay());
    const afterNewDay = outbox.pendingCount();
    expect(afterNewDay).toBeGreaterThan(first);

    await act(() => c().nextDay()); // back to a day already logged
    await act(() => c().prevDay());
    expect(outbox.pendingCount()).toBe(afterNewDay);
  });

  it('a new log epoch (demo reset) logs the day on screen again', async () => {
    const outbox = new MemoryOutboxStore();
    const c = await renderController(outbox);
    const n = outbox.pendingCount();
    outbox.markSent(outbox.pending(n).map(i => i.key)); // what a reset does
    await c.setEpoch(1);
    expect(outbox.pendingCount()).toBe(n);
  });
});
