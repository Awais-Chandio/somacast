import { LogEntrySchema, assess } from '@somacast/core';
import { simulateMission } from '../shared/model/simulateMission';
import { blackBoxEntries } from './blackBox';

describe('blackBoxEntries', () => {
  const sim = simulateMission('blackoutDecline');

  it('one reading plus one entry per alert, all valid log entries', () => {
    const out = blackBoxEntries(sim, 'blackoutDecline', 'C2', 75);
    const alerts = assess(sim.readings, 'C2', 75).alerts;
    expect(alerts.length).toBeGreaterThan(0); // Kenji is in a Storm on day 75
    expect(out.filter(e => e.kind === 'reading')).toHaveLength(1);
    expect(out.filter(e => e.kind === 'alert')).toHaveLength(alerts.length);
    for (const e of out) expect(LogEntrySchema.safeParse(e).success).toBe(true);
    expect(out[0]!.payload.simulated).toBe(true);
  });

  it('ids are stable: the same day gives the same ids', () => {
    const a = blackBoxEntries(sim, 'blackoutDecline', 'C2', 75).map(e => e.id);
    const b = blackBoxEntries(sim, 'blackoutDecline', 'C2', 75).map(e => e.id);
    expect(a).toEqual(b);
    expect(a[0]).toBe('blackoutDecline-C2-75-reading');
    expect(new Set(a).size).toBe(a.length);
  });
});
