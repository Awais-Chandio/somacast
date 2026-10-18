import { describe, it, expect } from '@jest/globals';
import {
  alertText,
  assess,
  buildHandoff,
  coachText,
  forecastReasons,
  handoffText,
  isMedicationAdvice,
  isMode,
  metricIds,
  renderHandoff,
  scenarios,
  simulate,
  type HandoffContext,
} from '../index';

const base = { crewCount: 4, days: 90, startDate: '2027-01-01' };
const jargon = /\b(LOS|AOS|crews?|flight surgeons?|cabin|mission|CMO)\b/i;

const blackout = simulate({
  ...base,
  seed: 42,
  scenario: scenarios.blackoutDecline,
});

describe('engine text by mode (REQ-019)', () => {
  it('same alert, Space vs Earth: only the words change', () => {
    const { alerts } = assess(blackout.readings, 'C1', 75);
    const co2 = alerts.find(a => a.metric === 'cabinCo2')!;
    const space = alertText(co2, 'space');
    const earth = alertText(co2, 'earth');
    expect(space).toBe(co2.reason); // the stored log text
    expect(space).toMatch(/^Cabin CO2 partial pressure \d/);
    expect(earth).toMatch(/^Indoor CO2 partial pressure \d/);
    expect(earth.replace('Indoor', 'Cabin')).toBe(space); // same numbers
    expect(space).toContain('the usual 2.1 mmHg'); // 2.05 rounds up, as on the alert card
  });

  it('Space wording of every alert and forecast is exactly the stored text', () => {
    for (const key of ['normal', 'blackoutDecline', 'solarStorm'] as const)
      for (let seed = 1; seed <= 5; seed++) {
        const { readings } = simulate({
          ...base,
          seed,
          scenario: scenarios[key],
        });
        for (const c of ['C1', 'C2', 'C3', 'C4'])
          for (let d = 0; d < 90; d += 3) {
            const { alerts, forecast } = assess(readings, c, d);
            for (const a of alerts) expect(alertText(a)).toBe(a.reason);
            expect(forecastReasons(forecast, alerts)).toEqual(forecast.reasons);
          }
      }
  });

  it('forecast reasons: "crew member" in Space, "team member" in Earth', () => {
    const normal = simulate({ ...base, seed: 42, scenario: scenarios.normal });
    const { alerts, forecast } = assess(normal.readings, 'C1', 60);
    expect(forecast.state).toBe('clear');
    expect(forecastReasons(forecast, alerts, 'space')).toEqual([
      "All metrics are close to this crew member's usual range.",
    ]);
    expect(forecastReasons(forecast, alerts, 'earth')).toEqual([
      "All metrics are close to this team member's usual range.",
    ]);
  });

  it('Earth coach text: one per metric, no medication, no space jargon', () => {
    for (const m of metricIds) {
      const t = coachText.earth[m];
      expect([m, isMedicationAdvice(t), jargon.test(t)]).toEqual([
        m,
        false,
        false,
      ]);
    }
  });

  it('isMode', () => {
    expect(isMode('space')).toBe(true);
    expect(isMode('earth')).toBe(true);
    expect(isMode('mars')).toBe(false);
    expect(isMode(null)).toBe(false);
  });
});

describe('SBAR handoff by mode', () => {
  const kenji = blackout.crew.find(c => c.id === 'C2')!;
  const { alerts, forecast } = assess(blackout.readings, 'C2', 75);
  const ctx: HandoffContext = {
    id: 'handoff-test',
    createdAt: '2027-03-17T14:05:00.000Z',
    asOfDay: 75,
    blackout: {
      start: '2027-03-17T10:45:00.000Z',
      end: '2027-03-17T14:05:00.000Z',
    },
    heldEntries: 312,
  };
  const h = buildHandoff(blackout.readings, alerts, forecast, kenji, ctx);

  it('stores its facts, and the Space text of the facts is the stored text', () => {
    expect(h.facts).toBeDefined();
    const { situation, background, assessment, recommendation } = h;
    expect(handoffText(h.facts!, 'space')).toEqual({
      situation,
      background,
      assessment,
      recommendation,
    });
    expect(renderHandoff(h, 'space').situation).toBe(situation);
  });

  it('Earth: offline wording, indoor CO2, remote doctor, no space jargon', () => {
    const e = renderHandoff(h, 'earth');
    expect(e.situation).toMatch(/^Kenji \(C2\), day 75: Storm forecast/);
    expect(e.background).toContain(
      'Offline for 3 h 20 min, 2027-03-17 10:45 UTC to 2027-03-17 14:05 UTC.',
    );
    expect(e.background).toContain('sent them when back online.');
    expect(e.background).toContain(
      'Personal baseline learned from days 0 to 27 (28 days); day 75 is 48 days after it.',
    );
    expect(e.recommendation.split('\n').at(-1)).toBe(
      'Remote doctor review requested.',
    );
    for (const text of Object.values(e))
      expect([text, jargon.test(text)]).toEqual([text, false]);
  });

  it('a handoff stored before facts existed shows its stored text in both modes', () => {
    const { facts: _facts, ...old } = h;
    const stored = {
      situation: old.situation,
      background: old.background,
      assessment: old.assessment,
      recommendation: old.recommendation,
    };
    expect(renderHandoff(old, 'space')).toEqual(stored);
    expect(renderHandoff(old, 'earth')).toEqual(stored);
  });
});
