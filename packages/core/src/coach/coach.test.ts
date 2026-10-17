import { describe, it, expect } from '@jest/globals';
import {
  assess,
  coachActions,
  coachRules,
  isMedicationAdvice,
  metricIds,
  scenarios,
  simulate,
  ILLUSTRATIVE,
  MAX_COACH_ACTIONS,
  type Alert,
  type Forecast,
  type MetricId,
} from '../index';

const forecast = (state: Forecast['state'], crewId = 'C2'): Forecast => ({
  crewId,
  generatedAt: '2027-03-17T12:00:00Z',
  horizonHours: 72,
  state,
  confidence: 'normal',
  reasons: [],
});

const alert = (
  metric: MetricId,
  zscore: number,
  severity: Alert['severity'] = 'medium',
  crewId = 'C2',
): Alert => ({
  id: `${crewId}-${metric}-2027-03-17`,
  crewId,
  metric,
  value: 1,
  baseline: 2,
  zscore,
  days: 3,
  reason: `${metric} reason`,
  severity,
  createdAt: '2027-03-17T12:00:00Z',
});

describe('coach actions', () => {
  it('sleep low: protect the next sleep window, naming the sleep alert', () => {
    const a = alert('sleepHours', -2.6);
    const [action, ...rest] = coachActions([a], forecast('cloudy'));
    expect(rest).toHaveLength(0);
    expect(action).toEqual({
      id: `${a.id}-action`,
      alertId: a.id,
      alertLabel: 'Sleep duration alert',
      metric: 'sleepHours',
      text: 'Protect your next sleep window; ask the CMO about the schedule.',
      when: 'next 72 h',
      label: 'illustrative, expert review required',
    });
  });

  it('at most 3 actions, most urgent alert first, each naming its alert', () => {
    const alerts = [
      alert('psychCheckin', -2.2),
      alert('cabinCo2', 4.1),
      alert('sleepHours', -3.4, 'high'),
      alert('restingHr', 2.5),
      alert('hrv', -2.9),
    ];
    const actions = coachActions(alerts, forecast('storm'));
    expect(actions).toHaveLength(MAX_COACH_ACTIONS);
    // high first, then by |z|: CO2 4.1 > HRV 2.9
    expect(actions.map(a => a.metric)).toEqual([
      'sleepHours',
      'cabinCo2',
      'hrv',
    ]);
    const ids = new Set(alerts.map(a => a.id));
    for (const a of actions) {
      expect(ids.has(a.alertId)).toBe(true);
      expect(a.alertLabel).toMatch(/ alert$/);
      expect(a.label).toBe(ILLUSTRATIVE);
      expect(a.when).toBe('today'); // Storm
    }
  });

  it('no alerts, no actions (a Clear day says nothing)', () => {
    expect(coachActions([], forecast('clear'))).toEqual([]);
  });

  it("ignores another crew member's alerts", () => {
    expect(
      coachActions([alert('sleepHours', -3, 'high', 'C1')], forecast('storm')),
    ).toEqual([]);
  });

  it('Kenji (C2), blackout decline, day 75: 1 to 3 actions, all traced to real alerts', () => {
    const { readings } = simulate({
      seed: 42,
      crewCount: 4,
      days: 90,
      startDate: '2027-01-01',
      scenario: scenarios.blackoutDecline,
    });
    const { alerts, forecast: f } = assess(readings, 'C2', 75);
    const actions = coachActions(alerts, f);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.length).toBeLessThanOrEqual(3);
    for (const a of actions)
      expect(alerts.some(x => x.id === a.alertId)).toBe(true);
  });
});

describe('no medication or dosing advice, ever', () => {
  it('no rule text, for any metric, severity or forecast, mentions a medication or a dose', () => {
    for (const metric of metricIds) {
      expect(isMedicationAdvice(coachRules[metric])).toBe(false);
      for (const severity of ['low', 'medium', 'high'] as const)
        for (const state of ['clear', 'cloudy', 'storm'] as const)
          for (const a of coachActions(
            [alert(metric, -3, severity)],
            forecast(state),
          ))
            expect(isMedicationAdvice(a.text)).toBe(false);
    }
  });

  it('the guard catches medication and dosing wording', () => {
    for (const bad of [
      'Take 5 mg melatonin before sleep.',
      'Ask for a sleeping aid.',
      'Double your dose.',
      'Consider medication for the headache.',
      'Take two pills with water.',
      'Increase dosage to 400 mcg.',
      'Have some caffeine.',
      'Take potassium iodide.',
    ])
      expect(isMedicationAdvice(bad)).toBe(true);
  });

  it('a rule that slips medication in is dropped, never shown', () => {
    const poisoned = {
      ...coachRules,
      sleepHours: 'Take 5 mg melatonin before your next sleep window.',
    };
    const actions = coachActions(
      [alert('sleepHours', -3, 'high'), alert('hrv', -2.5)],
      forecast('storm'),
      poisoned,
    );
    expect(actions.map(a => a.metric)).toEqual(['hrv']);
  });
});
