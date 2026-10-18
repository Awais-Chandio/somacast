import {
  LogEntrySchema,
  MemoryOutboxStore,
  MockGroundStore,
  assess,
  flushOutbox,
  mockTransport,
} from '@somacast/core';
import { simulateMission } from '../shared/model/simulateMission';
import { blackBoxEntries, missionHistory, recordHistory } from './blackBox';

describe('blackBoxEntries', () => {
  const sim = simulateMission('blackoutDecline');

  it('one reading plus one entry per alert, all valid log entries', () => {
    const out = blackBoxEntries(sim, 'blackoutDecline', 'C2', 75);
    const alerts = assess(sim.readings, 'C2', 75).alerts;
    expect(alerts.length).toBeGreaterThan(0); // Kenji is in a Storm on day 75
    expect(out.filter(e => e.kind === 'reading')).toHaveLength(1);
    expect(out.filter(e => e.kind === 'alert')).toHaveLength(alerts.length);
    for (const e of out) expect(LogEntrySchema.safeParse(e).success).toBe(true);
    expect(out[0]!.payload.source).toBe('simulated');
  });

  it('ids are stable: the same day gives the same ids', () => {
    const a = blackBoxEntries(sim, 'blackoutDecline', 'C2', 75).map(e => e.id);
    const b = blackBoxEntries(sim, 'blackoutDecline', 'C2', 75).map(e => e.id);
    expect(a).toEqual(b);
    expect(a[0]).toBe('blackoutDecline-C2-75-reading');
    expect(new Set(a).size).toBe(a.length);
  });
});

describe('missionHistory + recordHistory', () => {
  const decline = simulateMission('blackoutDecline');
  const normal = simulateMission('normal');
  const alertsThrough = (sim: typeof decline, crewId: string, day: number) => {
    let n = 0;
    for (let d = 0; d <= day; d++)
      n += assess(sim.readings, crewId, d).alerts.length;
    return n;
  };

  it('Kenji, blackout decline, day 75: 76 readings (days 0..75) plus every alert on the way', () => {
    const h = missionHistory(decline, 'blackoutDecline', 'C2', 75);
    const readings = h.filter(e => e.kind === 'reading');
    expect(readings).toHaveLength(76);
    expect(readings.map(e => e.payload.day)).toEqual(
      Array.from({ length: 76 }, (_, d) => d),
    );
    expect(h.filter(e => e.kind === 'alert')).toHaveLength(
      alertsThrough(decline, 'C2', 75),
    );
    expect(h.filter(e => e.kind === 'alert').length).toBeGreaterThan(0);
    expect(new Set(h.map(e => e.crewId))).toEqual(new Set(['C2']));
    for (const e of h) expect(LogEntrySchema.safeParse(e).success).toBe(true);
  });

  it('Maya, normal, day 89: 90 readings', () => {
    const h = missionHistory(normal, 'normal', 'C1', 89);
    expect(h.filter(e => e.kind === 'reading')).toHaveLength(90);
  });

  it('same ids as a visited day, so history and screen never duplicate', () => {
    const h = missionHistory(decline, 'blackoutDecline', 'C2', 75).map(
      e => e.id,
    );
    for (const e of blackBoxEntries(decline, 'blackoutDecline', 'C2', 40))
      expect(h).toContain(e.id);
    expect(new Set(h).size).toBe(h.length);
  });

  it('record: count = days + 1 readings (plus alerts); a rerun adds 0', () => {
    const store = new MemoryOutboxStore();
    const h = missionHistory(decline, 'blackoutDecline', 'C2', 75);
    expect(recordHistory(store, h)).toBe(h.length);
    expect(
      store.pending(1000).filter(i => i.entry.kind === 'reading'),
    ).toHaveLength(76);
    expect(recordHistory(store, h)).toBe(0);
    expect(store.pendingCount()).toBe(h.length);
  });

  it('uses the store transaction when there is one', () => {
    const store = Object.assign(new MemoryOutboxStore(), {
      batch: jest.fn((fn: () => void) => fn()),
    });
    recordHistory(store, missionHistory(normal, 'normal', 'C1', 3));
    expect(store.batch).toHaveBeenCalledTimes(1);
    expect(store.pendingCount()).toBe(4);
  });

  it('recorded again after a sync: the ground still stores each entry once', async () => {
    const store = new MemoryOutboxStore();
    const ground = new MockGroundStore();
    const transport = mockTransport(ground, { linkUp: () => true });
    const h = missionHistory(decline, 'blackoutDecline', 'C2', 75);
    recordHistory(store, h);
    await flushOutbox(store, transport, { batchSize: 200, maxBatches: 10 });
    expect(ground.size()).toBe(h.length);
    recordHistory(store, h); // next sign-in
    await flushOutbox(store, transport, { batchSize: 200, maxBatches: 10 });
    expect(ground.size()).toBe(h.length);
    expect(store.pendingCount()).toBe(0);
  });
});
