import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { MemoryOutboxStore } from '@somacast/core';
import { useTodayController, type TodayController } from './useTodayController';
import { demoMissionFor, type DemoMission } from '../../../config/mission';

// Renders the hook inside a tiny component and keeps the latest result.
async function renderController(
  outbox = new MemoryOutboxStore(),
  epoch = 0,
  lockedCrewId?: string,
  mission?: DemoMission,
) {
  const ref: { current: TodayController | null } = { current: null };
  function Probe({ logEpoch }: { logEpoch: number }) {
    ref.current = useTodayController(
      outbox,
      undefined,
      logEpoch,
      lockedCrewId,
      mission,
    );
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

  it('a signed-in crew member sees, picks and logs only their own crew', async () => {
    const outbox = new MemoryOutboxStore();
    const c = await renderController(outbox, 0, 'C2');
    expect(c().crew.map(m => m.id)).toEqual(['C2']);
    expect(c().crewId).toBe('C2');
    await act(() => c().selectCrew('C1'));
    expect(c().crewId).toBe('C2');
    const crews = outbox.pending(100).map(i => i.entry.crewId);
    expect(crews.length).toBeGreaterThan(0);
    expect(new Set(crews)).toEqual(new Set(['C2']));
  });

  describe('data source', () => {
    it('starts simulated with the SIMULATED DATA badge', async () => {
      const c = await renderController();
      expect(c().source).toBe('simulated');
      expect(c().sources.map(s => s.key)).toEqual([
        'simulated',
        'importExample',
      ]);
      expect(c().badge.text).toBe('SIMULATED DATA');
      expect(c().importReport).toBeNull();
    });

    it('Import CSV: example file, its own crew and days, honest badge, same engine', async () => {
      const outbox = new MemoryOutboxStore();
      const c = await renderController(outbox);
      await act(() => c().selectSource('importExample'));
      expect(c().badge.text).toBe('IMPORTED DATA (example file)');
      expect(c().badge.readingsLabel).toBe('LATEST READINGS (IMPORTED)');
      expect(c().scenarios).toEqual([]); // scenarios only shape simulated data
      expect(c().crew.map(m => m.id)).toEqual(['EX1']);
      expect(c().crewId).toBe('EX1');
      expect(c().maxDay).toBe(29);
      expect(c().day).toBe(29); // a new source opens on its last day
      expect(c().view.alerts.map(a => a.metricLabel)).toContain(
        'Sleep duration',
      );
      // Logged under its own key, never mixed with a simulated scenario's days.
      expect(outbox.has('EX1:reading:import-example-EX1-29-reading')).toBe(
        true,
      );

      await act(() => c().prevDay());
      expect(c().day).toBe(28);
      await act(() => c().selectSource('simulated'));
      expect(c().badge.text).toBe('SIMULATED DATA');
      expect(c().crewId).toBe('C1');
      expect(c().day).toBe(89);
    });

    it('signed in: locked to simulated, so only simulated data reaches the real ground', async () => {
      const c = await renderController(
        new MemoryOutboxStore(),
        0,
        'C1',
        demoMissionFor('maya@somacast.test'),
      );
      expect(c().sources.map(s => s.key)).toEqual(['simulated']);
      await act(() => c().selectSource('importExample'));
      expect(c().source).toBe('simulated');
      expect(c().badge.text).toBe('SIMULATED DATA');
    });
  });

  describe('signed in: whole mission history', () => {
    const readingDays = (outbox: MemoryOutboxStore) =>
      outbox
        .pending(5000)
        .filter(i => i.entry.kind === 'reading')
        .map(i => i.entry.payload.day as number)
        .sort((a, b) => a - b);

    it('Kenji: blackout decline locked, opens on day 75 in Storm, days 0..75 recorded', async () => {
      const outbox = new MemoryOutboxStore();
      const c = await renderController(
        outbox,
        0,
        'C2',
        demoMissionFor('kenji@somacast.test'),
      );
      expect(c().scenario).toBe('blackoutDecline');
      expect(c().scenarios.map(s => s.key)).toEqual(['blackoutDecline']);
      expect(c().day).toBe(75);
      expect(c().view.state).toBe('storm');
      expect(readingDays(outbox)).toEqual(
        Array.from({ length: 76 }, (_, d) => d),
      );
      await act(() => c().selectScenario('normal'));
      expect(c().scenario).toBe('blackoutDecline'); // the account's scenario
    });

    it('Maya: normal, day 89, 90 readings; a re-render or revisit adds 0', async () => {
      const outbox = new MemoryOutboxStore();
      const c = await renderController(
        outbox,
        0,
        'C1',
        demoMissionFor('maya@somacast.test'),
      );
      expect(c().day).toBe(89);
      expect(readingDays(outbox)).toHaveLength(90);
      const n = outbox.pendingCount();
      await act(() => c().prevDay());
      await act(() => c().nextDay());
      await c.setEpoch(0);
      expect(outbox.pendingCount()).toBe(n);
    });

    it('after a demo reset the history is recorded again', async () => {
      const outbox = new MemoryOutboxStore();
      const c = await renderController(
        outbox,
        0,
        'C2',
        demoMissionFor('kenji@somacast.test'),
      );
      const n = outbox.pendingCount();
      outbox.markSent(outbox.pending(n).map(i => i.key));
      await c.setEpoch(1);
      expect(outbox.pendingCount()).toBe(n);
    });

    it('offline (no mission): only the days on screen are logged', async () => {
      const outbox = new MemoryOutboxStore();
      await renderController(outbox);
      expect(readingDays(outbox)).toEqual([89]);
    });
  });

  it('demoMissionFor: known accounts, case-insensitive, default for others', () => {
    expect(demoMissionFor('Kenji@Somacast.test')).toEqual({
      scenario: 'blackoutDecline',
      day: 75,
    });
    expect(demoMissionFor('maya@somacast.test')).toEqual({
      scenario: 'normal',
      day: 89,
    });
    expect(demoMissionFor('someone@else.test')).toEqual({
      scenario: 'normal',
      day: 89,
    });
    expect(demoMissionFor(null).scenario).toBe('normal');
  });
});
