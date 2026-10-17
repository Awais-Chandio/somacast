import { describe, it, expect } from '@jest/globals';
import {
  simulate,
  scenarios,
  assess,
  detectAnomalies,
  AlertSchema,
  ForecastSchema,
  computeBaseline,
  indexByDay,
} from './index';

const base = { crewCount: 4, days: 90, startDate: '2027-01-01' };
const CREW = ['C1', 'C2', 'C3', 'C4'];

describe('baseline', () => {
  it('learns a personal sleep baseline close to the simulated person', () => {
    const { readings } = simulate({
      ...base,
      seed: 42,
      scenario: scenarios.normal,
    });
    const b = computeBaseline(indexByDay(readings, 'C1'), 'sleepHours', 0, 28)!;
    expect(b.n).toBe(28);
    expect(b.mean).toBeGreaterThan(5);
    expect(b.mean).toBeLessThan(7.2);
    expect(b.sd).toBeGreaterThan(0.2);
    expect(b.sd).toBeLessThan(0.9);
  });

  it('gives no alerts while still learning (under 14 days)', () => {
    const { readings } = simulate({
      ...base,
      seed: 42,
      scenario: scenarios.solarStorm,
    });
    for (const c of CREW)
      for (let d = 0; d < 14; d++)
        expect(detectAnomalies(readings, c, d)).toEqual([]);
  });
});

describe('anomaly detection', () => {
  it('normal days: under 1% of crew-days raise any alert (30 seeds)', () => {
    let n = 0;
    let alerted = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { readings } = simulate({
        ...base,
        seed,
        scenario: scenarios.normal,
      });
      for (const c of CREW)
        for (let d = 30; d < 90; d++) {
          n++;
          if (detectAnomalies(readings, c, d).length) alerted++;
        }
    }
    expect(alerted / n).toBeLessThan(0.01);
  });

  it('every alert is valid and explains itself', () => {
    const { readings } = simulate({
      ...base,
      seed: 42,
      scenario: scenarios.blackoutDecline,
    });
    const alerts = CREW.flatMap(c => detectAnomalies(readings, c, 75));
    expect(alerts.length).toBeGreaterThan(0);
    for (const a of alerts) {
      expect(AlertSchema.safeParse(a).success).toBe(true);
      expect(a.reason).toMatch(/for \d+ days in a row/);
      expect(a.days).toBeGreaterThanOrEqual(3);
    }
  });

  it('solar storm: radiation alert for every crew member on day 62, gone by day 70', () => {
    const { readings } = simulate({
      ...base,
      seed: 42,
      scenario: scenarios.solarStorm,
    });
    for (const c of CREW) {
      expect(
        detectAnomalies(readings, c, 62).some(
          a => a.metric === 'radiationDose',
        ),
      ).toBe(true);
      expect(
        detectAnomalies(readings, c, 70).some(
          a => a.metric === 'radiationDose',
        ),
      ).toBe(false);
    }
  });
});

describe('72 h forecast', () => {
  it('normal days: under 3% of crew-days are not Clear, and never Storm (15 seeds)', () => {
    let n = 0;
    let notClear = 0;
    let storm = 0;
    for (let seed = 1; seed <= 15; seed++) {
      const { readings } = simulate({
        ...base,
        seed,
        scenario: scenarios.normal,
      });
      for (const c of CREW)
        for (let d = 30; d < 90; d += 2) {
          n++;
          const s = assess(readings, c, d).forecast.state;
          if (s !== 'clear') notClear++;
          if (s === 'storm') storm++;
        }
    }
    expect(notClear / n).toBeLessThan(0.03);
    expect(storm).toBe(0);
  });

  it('blackout: C2 reaches Storm after the decline starts (day 45) in all 10 seeds, and C1 never does', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { readings } = simulate({
        ...base,
        seed,
        scenario: scenarios.blackoutDecline,
      });
      const c2 = [];
      const c1 = [];
      for (let d = 30; d < 90; d++) {
        c2.push(assess(readings, 'C2', d).forecast.state);
        c1.push(assess(readings, 'C1', d).forecast.state);
      }
      const firstStorm = c2.indexOf('storm') + 30;
      expect(firstStorm).toBeGreaterThan(45);
      expect(firstStorm).toBeLessThan(80);
      expect(c1).not.toContain('storm');
    }
  });

  it('blackout: C2 is Storm at the end of the decline (day 75) in at least 45 of 50 seeds', () => {
    let storm = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const { readings } = simulate({
        ...base,
        seed,
        scenario: scenarios.blackoutDecline,
      });
      if (assess(readings, 'C2', 75).forecast.state === 'storm') storm++;
    }
    expect(storm).toBeGreaterThanOrEqual(45);
  });

  it('shared cabin CO2 problem makes healthy crew Cloudy, not Storm', () => {
    const { readings } = simulate({
      ...base,
      seed: 3,
      scenario: scenarios.blackoutDecline,
    });
    const f = assess(readings, 'C1', 75).forecast;
    expect(f.state).toBe('cloudy');
    expect(f.reasons.join(' ')).toMatch(/CO2/);
  });

  it('low confidence with under 14 days of data or too many missing days', () => {
    const { readings } = simulate({
      ...base,
      seed: 42,
      scenario: scenarios.normal,
    });
    expect(assess(readings, 'C1', 10).forecast.confidence).toBe('low');
    expect(assess(readings, 'C1', 40).forecast.confidence).toBe('normal');
    const gappy = readings.filter(
      r => !(r.crewId === 'C1' && r.day >= 36 && r.day <= 38),
    );
    expect(assess(gappy, 'C1', 40).forecast.confidence).toBe('low');
  });

  it('forecast is valid, 72 h, same input gives same output', () => {
    const { readings } = simulate({
      ...base,
      seed: 7,
      scenario: scenarios.blackoutDecline,
    });
    const a = assess(readings, 'C2', 70);
    expect(ForecastSchema.safeParse(a.forecast).success).toBe(true);
    expect(a.forecast.horizonHours).toBe(72);
    expect(assess(readings, 'C2', 70)).toEqual(a);
  });
});
