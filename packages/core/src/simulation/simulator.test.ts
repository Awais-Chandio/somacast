import { describe, it, expect } from '@jest/globals';
import {
  simulate,
  scenarios,
  ReadingSchema,
  ScenarioSchema,
  AlertSchema,
  effectDelta,
  simulatedCrewName,
} from '../index';

const base = { seed: 42, crewCount: 4, days: 90, startDate: '2027-01-01' };

describe('simulator', () => {
  it('same seed gives identical data', () => {
    const a = simulate({ ...base, scenario: scenarios.normal });
    const b = simulate({ ...base, scenario: scenarios.normal });
    expect(a).toEqual(b);
  });

  it('different seed gives different data', () => {
    const a = simulate({ ...base, scenario: scenarios.normal });
    const b = simulate({ ...base, seed: 43, scenario: scenarios.normal });
    expect(a.readings).not.toEqual(b.readings);
  });

  it('makes 4 crew x 90 days of valid, simulated-labelled readings', () => {
    const { crew, readings } = simulate({
      ...base,
      scenario: scenarios.normal,
    });
    expect(crew).toHaveLength(4);
    expect(readings).toHaveLength(360);
    for (const r of readings)
      expect(ReadingSchema.safeParse(r).success).toBe(true);
  });

  it('sleep matches the ISS calibration: mean near 6.09 h, about 44% of nights under 6 h', () => {
    let nights = 0;
    let under6 = 0;
    let sum = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { readings } = simulate({
        ...base,
        seed,
        scenario: scenarios.normal,
      });
      for (const r of readings) {
        nights++;
        sum += r.sleepHours;
        if (r.sleepHours < 6) under6++;
      }
    }
    const mean = sum / nights;
    const share = under6 / nights;
    expect(mean).toBeGreaterThan(5.95);
    expect(mean).toBeLessThan(6.25);
    expect(share).toBeGreaterThan(0.35);
    expect(share).toBeLessThan(0.55);
  });

  it('cabin CO2 stays inside the published 1 to 9 mmHg range in normal days', () => {
    const { readings } = simulate({ ...base, scenario: scenarios.normal });
    for (const r of readings) {
      expect(r.cabinCo2).toBeGreaterThan(1);
      expect(r.cabinCo2).toBeLessThan(9);
    }
  });

  it('blackout scenario lowers C2 sleep and raises CO2 late in the run', () => {
    const n = simulate({ ...base, scenario: scenarios.normal });
    const s = simulate({ ...base, scenario: scenarios.blackoutDecline });
    const day = 75;
    const pick = (res: typeof n, id: string) =>
      res.readings.find(r => r.crewId === id && r.day === day)!;
    expect(pick(s, 'C2').sleepHours).toBeLessThan(pick(n, 'C2').sleepHours - 1);
    expect(pick(s, 'C2').cabinCo2).toBeGreaterThan(pick(n, 'C2').cabinCo2 + 1);
    // Other crew keep normal sleep
    expect(pick(s, 'C1').sleepHours).toBeCloseTo(pick(n, 'C1').sleepHours, 5);
  });

  it('scenario only changes what it names (same random draws)', () => {
    const n = simulate({ ...base, scenario: scenarios.normal });
    const s = simulate({ ...base, scenario: scenarios.solarStorm });
    const a = n.readings.find(r => r.crewId === 'C1' && r.day === 10)!;
    const b = s.readings.find(r => r.crewId === 'C1' && r.day === 10)!;
    expect(b).toEqual(a);
  });

  it('solar storm spikes radiation for all crew on days 60 to 62', () => {
    const n = simulate({ ...base, scenario: scenarios.normal });
    const s = simulate({ ...base, scenario: scenarios.solarStorm });
    const get = (res: typeof n, day: number) =>
      res.readings.find(r => r.crewId === 'C3' && r.day === day)!;
    expect(get(s, 61).radiationDose).toBeGreaterThan(
      get(n, 61).radiationDose + 3,
    );
    expect(get(s, 70).radiationDose).toBeCloseTo(get(n, 70).radiationDose, 5);
  });
});

describe('simulatedCrewName', () => {
  it('matches the names simulate() gives each crew id', () => {
    const { crew } = simulate({
      seed: 1,
      crewCount: 4,
      days: 1,
      startDate: '2027-01-01',
      scenario: scenarios.normal,
    });
    for (const m of crew) expect(simulatedCrewName(m.id)).toBe(m.name);
    expect(simulatedCrewName('C1')).toBe('Maya');
    expect(simulatedCrewName('C9')).toBeNull();
    expect(simulatedCrewName('ZZ-TEST')).toBeNull();
  });
});

describe('schemas and scenarios', () => {
  it('rejects a reading that is not marked simulated', () => {
    const { readings } = simulate({ ...base, scenario: scenarios.normal });
    expect(
      ReadingSchema.safeParse({ ...readings[0], simulated: false }).success,
    ).toBe(false);
  });

  it('rejects an alert without a reason', () => {
    const alert = {
      id: 'a1',
      crewId: 'C2',
      metric: 'sleepHours',
      value: 4.2,
      baseline: 6.1,
      zscore: -3.1,
      days: 3,
      reason: '',
      severity: 'high',
      createdAt: '2027-02-01T10:00:00Z',
    };
    expect(AlertSchema.safeParse(alert).success).toBe(false);
    expect(
      AlertSchema.safeParse({
        ...alert,
        reason: 'Sleep 4.2 h vs your 6.1 h baseline for 3 nights',
      }).success,
    ).toBe(true);
  });

  it('rejects a scenario whose end day is before its start day', () => {
    const bad = {
      id: 'x',
      title: 'x',
      description: 'x',
      effects: [
        {
          metric: 'hrv',
          crew: 'all',
          startDay: 5,
          endDay: 2,
          kind: 'step',
          delta: 1,
        },
      ],
    };
    expect(ScenarioSchema.safeParse(bad).success).toBe(false);
  });

  it('ramp grows linearly and reaches full delta on the last day', () => {
    const effects = scenarios.blackoutDecline.effects;
    expect(effectDelta(effects, 'sleepHours', 'C2', 44)).toBe(0);
    expect(effectDelta(effects, 'sleepHours', 'C2', 75)).toBeCloseTo(-2, 5);
    expect(effectDelta(effects, 'sleepHours', 'C1', 75)).toBe(0);
  });
});
