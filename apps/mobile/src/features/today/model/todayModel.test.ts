import { copy, scenarios, simulate } from '@somacast/core';
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

  it('coach actions: Kenji day 75 gets up to 3, each from one of his alerts; a Clear day gets none', () => {
    const v = buildTodayView(blackout, 'C2', 75);
    expect(v.actions.length).toBeGreaterThan(0);
    expect(v.actions.length).toBeLessThanOrEqual(3);
    for (const a of v.actions) {
      expect(a.fromText).toMatch(/^From: .+ alert$/);
      expect(a.whenText).toBe('Today'); // Storm
      expect(a.label).toBe('illustrative, expert review required');
    }
    expect(v.actions[0]!.text).toBe(
      'Protect your next sleep window; ask the CMO about the schedule.',
    );
    expect(buildTodayView(normal, 'C1', 60).actions).toEqual([]);
  });

  it('day 5: low confidence while the baseline is still learning', () => {
    const v = buildTodayView(normal, 'C1', 5);
    expect(v.confidence).toBe('low');
    expect(v.reasons.join(' ')).toMatch(/Low confidence/);
  });

  it('Earth wording: indoor CO2 and "Day"; nothing else changes', () => {
    const space = buildTodayView(blackout, 'C1', 75);
    const earth = buildTodayView(blackout, 'C1', 75, copy.earth);
    const co2 = (v: typeof space) =>
      v.latest.find(r => r.metric === 'cabinCo2')!.label;
    expect(co2(space)).toBe('Cabin CO2 partial pressure');
    expect(co2(earth)).toBe('Indoor CO2 partial pressure');
    expect(earth.alerts.map(a => a.metricLabel)).toContain(
      'Indoor CO2 partial pressure',
    );
    // Same state, same numbers: only the CO2 label differs.
    expect(earth.dateLabel).toBe(space.dateLabel.replace('Mission day', 'Day'));
    const relabel = (v: typeof space) =>
      JSON.stringify({ ...v, dateLabel: '' }).replaceAll(
        'Indoor CO2',
        'Cabin CO2',
      );
    expect(relabel(earth)).toBe(relabel(space));
  });

  it('missing day: readings show "-" instead of a number', () => {
    const v = buildTodayView(normal, 'C1', 200);
    expect(v.dateLabel).toBe('Mission day 200 · no data');
    expect(v.latest.every(r => r.valueText === '-')).toBe(true);
  });
});
