import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useTodayController, type TodayController } from './useTodayController';

// Renders the hook inside a tiny component and keeps the latest result.
async function renderController() {
  const ref: { current: TodayController | null } = { current: null };
  function Probe() {
    ref.current = useTodayController();
    return null;
  }
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Probe />);
  });
  return () => ref.current as TodayController;
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
});
