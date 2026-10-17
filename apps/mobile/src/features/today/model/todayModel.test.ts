import { scenarios, simulate } from '@somacast/core';
import { buildTodayView } from './todayModel';

const base = { seed: 42, crewCount: 4, days: 90, startDate: '2027-01-01' };
const normal = simulate({ ...base, scenario: scenarios.normal });
const blackout = simulate({ ...base, scenario: scenarios.blackoutDecline });

describe('todayModel: buildTodayView', () => {
  it('normal day: Clear, normal confidence, no alerts, 7 readings with units', () => {
    const v = buildTodayView(normal, 'C1', 60);
    expect(v.crewName).toBe('Maya');
    expect(v.dateLabel).toBe('Mission day 60 · 2027-03-02');
    expect(v.state).toBe('clear');
    expect(v.confidence).toBe('normal');
    expect(v.alerts).toEqual([]);
    expect(v.reasons.length).toBeGreaterThan(0);
    expect(v.latest).toHaveLength(7);
    for (const r of v.latest) {
      expect(r.valueText).not.toBe('-');
      expect(r.unit.length).toBeGreaterThan(0);
    }
  });

  it('blackout decline: Storm for C2 around day 75, alerts are fully worded', () => {
    const v = buildTodayView(blackout, 'C2', 75);
    expect(v.crewName).toBe('Kenji');
    expect(v.state).toBe('storm');
    expect(v.alerts.length).toBeGreaterThan(0);
    for (const a of v.alerts) {
      expect(a.valueText).toMatch(/^-?\d+(\.\d+)? \S/);
      expect(a.usualText).toMatch(/^usual /);
      expect(a.zText).toMatch(/^z -?\d+\.\d$/);
      expect(a.daysText).toMatch(/^\d+ days? in a row$/);
      expect(['Low', 'Medium', 'High']).toContain(a.severityWord);
    }
  });

  it('day 5: low confidence while the baseline is still learning', () => {
    const v = buildTodayView(normal, 'C1', 5);
    expect(v.confidence).toBe('low');
    expect(v.reasons.join(' ')).toMatch(/Low confidence/);
  });

  it('missing day: readings show "-" instead of a number', () => {
    const v = buildTodayView(normal, 'C1', 200);
    expect(v.dateLabel).toBe('Mission day 200 · no data');
    expect(v.latest.every(r => r.valueText === '-')).toBe(true);
  });
});
