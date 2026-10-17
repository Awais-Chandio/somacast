import { describe, it, expect } from '@jest/globals';
import {
  assess,
  buildHandoff,
  formatDuration,
  isMedicationAdvice,
  scenarios,
  simulate,
  HandoffSchema,
  HANDOFF_DISCLAIMER,
  type HandoffContext,
} from '../index';

// Kenji = C2 in the simulated mission, blackout decline, day 75 (the phone's demo day).
const { readings, crew } = simulate({
  seed: 42,
  crewCount: 4,
  days: 90,
  startDate: '2027-01-01',
  scenario: scenarios.blackoutDecline,
});
const kenji = crew.find(c => c.id === 'C2')!;
const { alerts, forecast } = assess(readings, 'C2', 75);

const ctx: HandoffContext = {
  id: 'handoff-blackoutDecline-C2-75-test',
  createdAt: '2027-03-17T14:05:00.000Z',
  asOfDay: 75,
  blackout: {
    start: '2027-03-17T10:45:00.000Z',
    end: '2027-03-17T14:05:00.000Z',
  },
  heldEntries: 312,
};

describe('SBAR handoff, Kenji blackout decline day 75', () => {
  const h = buildHandoff(readings, alerts, forecast, kenji, ctx);

  it('matches HandoffSchema', () => {
    expect(kenji.name).toBe('Kenji');
    expect(HandoffSchema.safeParse(h).success).toBe(true);
    expect(h.id).toBe(ctx.id);
    expect(h.crewId).toBe('C2');
    expect(h.createdAt).toBe(ctx.createdAt);
  });

  it('Situation: forecast word and the top alert', () => {
    expect(forecast.state).toBe('storm');
    expect(h.situation).toMatch(
      /^Kenji \(C2\), mission day 75: Storm forecast/,
    );
    const top = [...alerts].sort(
      (a, b) =>
        (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1) ||
        Math.abs(b.zscore) - Math.abs(a.zscore),
    )[0]!;
    expect(h.situation).toContain(`Top alert: ${top.reason}`);
  });

  it('Background: blackout length and days since the baseline', () => {
    expect(h.background).toContain('Out of contact (LOS) for 3 h 20 min');
    expect(h.background).toContain('312 log entries');
    expect(h.background).toContain(
      'Personal baseline learned from mission days 0 to 27 (28 days); mission day 75 is 48 days after it.',
    );
    expect(h.background).toContain('simulated');
  });

  it('Assessment: every alert reason', () => {
    expect(alerts.length).toBeGreaterThan(1);
    for (const a of alerts) expect(h.assessment).toContain(a.reason);
  });

  it('Recommendation: coach actions, labelled, then ground review', () => {
    const lines = h.recommendation.split('\n');
    expect(lines.at(-1)).toBe('Ground review requested.');
    const actions = lines.slice(0, -1);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.length).toBeLessThanOrEqual(3);
    for (const l of actions) {
      expect(l).toMatch(
        /\(from: .+ alert; illustrative, expert review required\)$/,
      );
      expect(isMedicationAdvice(l)).toBe(false);
    }
  });

  it('evidence = the alert ids; disclaimer is fixed', () => {
    expect([...h.evidence].sort()).toEqual(alerts.map(a => a.id).sort());
    expect(h.disclaimer).toBe(HANDOFF_DISCLAIMER);
    expect(h.disclaimer).toBe('Decision support only, not a medical device.');
  });

  it('same input, same handoff', () => {
    expect(buildHandoff(readings, alerts, forecast, kenji, ctx)).toEqual(h);
  });
});

describe('SBAR handoff, edge cases', () => {
  it('a Clear day: no alerts, no actions, still asks for ground review', () => {
    const normal = simulate({
      seed: 42,
      crewCount: 4,
      days: 90,
      startDate: '2027-01-01',
      scenario: scenarios.normal,
    });
    const a = assess(normal.readings, 'C1', 60);
    expect(a.forecast.state).toBe('clear');
    const h = buildHandoff(
      normal.readings,
      a.alerts,
      a.forecast,
      { id: 'C1', name: 'Maya' },
      { id: ctx.id, createdAt: ctx.createdAt, asOfDay: 60, blackout: null },
    );
    expect(h.situation).toContain('Clear forecast');
    expect(h.situation).toContain('No active alerts.');
    expect(h.background).toContain('No blackout before this handoff.');
    expect(h.evidence).toEqual([]);
    expect(h.recommendation).toBe('Ground review requested.');
  });

  it('early mission: the baseline is still learning', () => {
    const a = assess(readings, 'C2', 10);
    const h = buildHandoff(readings, a.alerts, a.forecast, kenji, {
      ...ctx,
      asOfDay: 10,
    });
    expect(h.background).toContain('still learning (8 of 14 days)');
    expect(h.situation).toContain('(low confidence)');
  });

  it('formatDuration', () => {
    expect(formatDuration(20_000)).toBe('under 1 min');
    expect(formatDuration(45 * 60_000)).toBe('45 min');
    expect(formatDuration(200 * 60_000)).toBe('3 h 20 min');
    expect(formatDuration((52 * 60 + 5) * 60_000)).toBe('2 d 4 h');
  });
});
