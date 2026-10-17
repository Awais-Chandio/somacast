import { describe, expect, it } from 'vitest';
import { assess, buildHandoff, scenarios, simulate } from '@somacast/core';
import {
  alertDomId,
  assessCrew,
  evidenceItems,
  formatDuration,
  losTimeline,
  noteProblem,
  parseAlertRows,
  parseHandoffRow,
  rowsToReadings,
  sparklines,
  summarizeCrews,
  type PayloadRow,
  type ReadingRow,
} from './ground';

// The same simulated mission the phone runs (apps/mobile/src/config/mission.ts).
const MISSION = { seed: 42, crewCount: 4, days: 90, startDate: '2027-01-01' };
const normal = simulate({ ...MISSION, scenario: scenarios.normal });
const decline = simulate({ ...MISSION, scenario: scenarios.blackoutDecline });

const at = (min: number) =>
  new Date(Date.UTC(2026, 9, 17, 12, min)).toISOString();

// What the phone's black box uploads for a reading (see apps/mobile/src/sync/blackBox.ts).
function readingRows(
  sim: typeof normal,
  scenario: string,
  crewId: string,
  days: number[],
  receivedMin = 0,
): ReadingRow[] {
  return sim.readings
    .filter(r => r.crewId === crewId && days.includes(r.day))
    .map(r => ({
      key: `${crewId}:reading:${scenario}-${crewId}-${r.day}-reading`,
      crew_id: crewId,
      received_at: at(receivedMin),
      payload: { ...r, scenario },
    }));
}

const allDays = Array.from({ length: 90 }, (_, d) => d);

describe('summarizeCrews', () => {
  it('one card per crew, counts every row, keeps the newest arrival, hides ZZ- crews', () => {
    const s = summarizeCrews([
      { crew_id: 'C2', received_at: at(5) },
      { crew_id: 'C1', received_at: at(1) },
      { crew_id: 'C1', received_at: at(9) },
      { crew_id: 'C1', received_at: at(3) },
      { crew_id: 'ZZ-TEST', received_at: at(20) },
      { crew_id: 'C10', received_at: at(2) },
    ]);
    expect(s.map(c => c.crewId)).toEqual(['C1', 'C2', 'C10']); // numeric order
    expect(s[0]).toEqual({
      crewId: 'C1',
      name: 'Maya',
      rows: 3,
      lastReceived: at(9),
    });
    expect(s[1]?.name).toBe('Kenji');
    expect(s[2]?.name).toBe('C10'); // not a simulated crew: the id is the name
  });
});

describe('rowsToReadings', () => {
  it('turns synced rows back into the exact simulated readings', () => {
    const cr = rowsToReadings(readingRows(normal, 'normal', 'C1', allDays)).get(
      'C1',
    );
    expect(cr?.scenario).toBe('normal');
    expect(cr?.readings).toEqual(
      normal.readings.filter(r => r.crewId === 'C1'),
    );
    expect(cr?.skipped).toBe(0);
  });

  it('skips the demo backlog, malformed payloads and rows that claim another crew', () => {
    const good = readingRows(normal, 'normal', 'C1', [10]);
    const backlog: ReadingRow = {
      key: 'C1:reading:backlog-x-0',
      crew_id: 'C1',
      received_at: at(0),
      payload: { simulated: true, demoBacklog: true, seq: 0 },
    };
    const notSimulated: ReadingRow = {
      ...good[0]!,
      key: 'k2',
      payload: { ...good[0]!.payload, simulated: false },
    };
    const otherCrew: ReadingRow = { ...good[0]!, key: 'k3', crew_id: 'C2' }; // payload says C1
    const out = rowsToReadings([...good, backlog, notSimulated, otherCrew]);
    expect(out.get('C1')?.readings).toHaveLength(1);
    expect(out.get('C1')?.skipped).toBe(2);
    expect(out.get('C2')?.readings).toHaveLength(0);
    expect(out.get('C2')?.skipped).toBe(1);
  });

  it('never mixes scenarios: the most recently received scenario wins', () => {
    const rows = [
      ...readingRows(normal, 'normal', 'C2', allDays, 0),
      ...readingRows(
        decline,
        'blackoutDecline',
        'C2',
        allDays.slice(0, 70),
        30,
      ),
    ];
    const cr = rowsToReadings(rows).get('C2');
    expect(cr?.scenario).toBe('blackoutDecline');
    expect(cr?.readings).toHaveLength(70);
    expect(cr?.readings.at(-1)?.day).toBe(69);
  });

  it('the same day twice keeps one reading (the later arrival)', () => {
    const first = readingRows(normal, 'normal', 'C1', [5], 0);
    const again = readingRows(normal, 'normal', 'C1', [5], 10).map(r => ({
      ...r,
      key: 'resent',
      payload: { ...r.payload, restingHr: 99 },
    }));
    const cr = rowsToReadings([...first, ...again]).get('C1');
    expect(cr?.readings).toHaveLength(1);
    expect(cr?.readings[0]?.restingHr).toBe(99);
  });

  it('ignores test crews', () => {
    const rows = readingRows(normal, 'normal', 'C1', [1]).map(r => ({
      ...r,
      crew_id: 'ZZ-TEST',
    }));
    expect(rowsToReadings(rows).size).toBe(0);
  });
});

describe('assessCrew (rows -> readings -> assess)', () => {
  it('matches core assess() on the original simulation, as of the newest synced day', () => {
    // Synced up to day 64: the blackout decline gives C2 a Storm there (seed 42).
    const synced = allDays.filter(d => d <= 64);
    const cr = rowsToReadings(
      readingRows(decline, 'blackoutDecline', 'C2', synced),
    ).get('C2');
    const a = assessCrew(cr);
    expect(a?.asOfDay).toBe(64);
    expect(a?.asOfDate).toBe('2027-03-06');
    expect(a?.forecast).toEqual(assess(decline.readings, 'C2', 64).forecast);
    expect(a?.alerts).toEqual(assess(decline.readings, 'C2', 64).alerts);
    expect(a?.forecast.state).toBe('storm');
    expect(a?.alerts.length).toBeGreaterThan(0);
    for (const al of a?.alerts ?? []) {
      expect(al.reason.length).toBeGreaterThan(0);
      expect(Number.isFinite(al.zscore)).toBe(true);
    }
  });

  it('a normal mission reads Clear', () => {
    const cr = rowsToReadings(readingRows(normal, 'normal', 'C1', allDays)).get(
      'C1',
    );
    expect(assessCrew(cr)?.forecast.state).toBe(
      assess(normal.readings, 'C1', 89).forecast.state,
    );
  });

  it('one synced day gives a low-confidence forecast, no readings gives null', () => {
    const cr = rowsToReadings(readingRows(normal, 'normal', 'C1', [89])).get(
      'C1',
    );
    const a = assessCrew(cr);
    expect(a?.forecast.confidence).toBe('low');
    expect(a?.readingDays).toBe(1);
    expect(assessCrew(undefined)).toBeNull();
    expect(
      assessCrew({ crewId: 'C1', scenario: 'none', readings: [], skipped: 3 }),
    ).toBeNull();
  });
});

describe('sparklines', () => {
  it('14 days per metric ending at the newest day, null where nothing arrived', () => {
    const days = allDays.filter(d => d !== 85); // day 85 lost
    const cr = rowsToReadings(readingRows(normal, 'normal', 'C1', days)).get(
      'C1',
    )!;
    const s = sparklines(cr, 89);
    expect(s).toHaveLength(7);
    const hr = s.find(x => x.metric === 'restingHr')!;
    expect(hr.points.map(p => p.day)).toEqual(
      Array.from({ length: 14 }, (_, i) => 76 + i),
    );
    expect(hr.points.find(p => p.day === 85)?.value).toBeNull();
    expect(hr.latest).toBe(
      normal.readings.find(r => r.crewId === 'C1' && r.day === 89)?.restingHr,
    );
    expect(hr.usual).not.toBeNull();
  });

  it('early in the mission: fewer points and no usual value while still learning', () => {
    const cr = rowsToReadings(
      readingRows(normal, 'normal', 'C1', [0, 1, 2, 3]),
    ).get('C1')!;
    const s = sparklines(cr, 3);
    expect(s[0]?.points).toHaveLength(4);
    expect(s[0]?.usual).toBeNull();
  });
});

describe('losTimeline', () => {
  const now = new Date(at(200));

  it('splits contacts at gaps of 15 min or more and ends with an open gap', () => {
    const t = losTimeline([at(0), at(1), at(2), at(40), at(41)], now);
    expect(t).toEqual([
      { kind: 'contact', from: at(0), to: at(2), rows: 3 },
      { kind: 'gap', from: at(2), to: at(40), open: false },
      { kind: 'contact', from: at(40), to: at(41), rows: 2 },
      { kind: 'gap', from: at(41), to: at(200), open: true },
    ]);
  });

  it('no open gap when the last row is recent; unsorted input is fine; empty gives nothing', () => {
    const t = losTimeline([at(195), at(190)], now);
    expect(t).toEqual([
      { kind: 'contact', from: at(190), to: at(195), rows: 2 },
    ]);
    expect(losTimeline([], now)).toEqual([]);
  });
});

describe('noteProblem and formatDuration', () => {
  it('rejects empty and overlong notes, accepts markup as plain text', () => {
    expect(noteProblem('   ')).toBe('Write a note first.');
    expect(noteProblem('x'.repeat(2001))).toMatch(/under 2,000/);
    expect(noteProblem('<b>Hydrate</b> & rest')).toBeNull();
  });

  it('formats gap lengths', () => {
    expect(formatDuration(45 * 60000)).toBe('45 min');
    expect(formatDuration(200 * 60000)).toBe('3 h 20 min');
    expect(formatDuration(52 * 3600000)).toBe('2 d 4 h');
  });
});

describe('format helpers', () => {
  it('keeps alert numbers precise and units readable', async () => {
    const { num, withUnit } = await import('../shared/format');
    expect(num(2.05, 2)).toBe('2.05');
    expect(num(37.8, 2)).toBe('37.8');
    expect(num(62)).toBe('62');
    expect(withUnit(3, '1 to 5')).toBe('3 (1 to 5)');
    expect(withUnit(56.04, 'bpm')).toBe('56 bpm');
  });
});

describe('SBAR handoff (Kenji, blackout decline, day 75)', () => {
  const kenji = decline.crew.find(c => c.id === 'C2')!;
  const day75 = assess(decline.readings, 'C2', 75);
  const handoff = buildHandoff(
    decline.readings,
    day75.alerts,
    day75.forecast,
    kenji,
    {
      id: 'handoff-blackoutDecline-C2-75-1',
      createdAt: '2026-10-17T14:05:00.000Z',
      asOfDay: 75,
      blackout: {
        start: '2026-10-17T13:58:00.000Z',
        end: '2026-10-17T14:05:00.000Z',
      },
      heldEntries: 312,
    },
  );
  // What the phone uploads (see apps/mobile/src/features/ground/model/handoff.ts).
  const row: PayloadRow = {
    key: `C2:crew_action:${handoff.id}`,
    crew_id: 'C2',
    received_at: at(30),
    payload: {
      type: 'handoff',
      scenario: 'blackoutDecline',
      state: 'storm',
      ...handoff,
    },
  };
  const alertRow = (a: (typeof day75.alerts)[number]): PayloadRow => ({
    key: `C2:alert:blackoutDecline-C2-75-alert-${a.metric}`,
    crew_id: 'C2',
    received_at: at(29),
    payload: { ...a, scenario: 'blackoutDecline' },
  });

  it('reads the handoff the phone sent', () => {
    const h = parseHandoffRow(row)!;
    expect(h.handoff).toEqual(handoff);
    expect(h.scenario).toBe('blackoutDecline');
    expect(h.state).toBe('storm');
    expect(h.receivedAt).toBe(at(30));
  });

  it('refuses a handoff stored under another crew, a test crew or a non-handoff', () => {
    expect(parseHandoffRow({ ...row, crew_id: 'C1' })).toBe(null);
    expect(parseHandoffRow({ ...row, crew_id: 'ZZ-TEST' })).toBe(null);
    expect(
      parseHandoffRow({ ...row, payload: { ...row.payload, type: 'note' } }),
    ).toBe(null);
    expect(
      parseHandoffRow({ ...row, payload: { ...row.payload, disclaimer: '' } }),
    ).toBe(null);
  });

  it('evidence links to the alerts on the page, in the handoff order', () => {
    const items = evidenceItems(handoff, [], day75.alerts);
    expect(items.map(i => i.alertId)).toEqual(handoff.evidence);
    for (const i of items) {
      expect(i.onPage).toBe(true);
      expect(i.reason).toMatch(/for \d+ days in a row/);
    }
    expect(items[0]!.label).toBe('Sleep duration');
    expect(alertDomId(items[0]!.alertId)).toBe(
      'alert-C2-sleepHours-2027-03-17',
    );
  });

  it('evidence not on the page falls back to the logged alert, then to the bare id', () => {
    const logged = parseAlertRows(day75.alerts.map(alertRow));
    expect(logged).toEqual(day75.alerts);
    const fromLog = evidenceItems(handoff, logged, []);
    expect(fromLog.every(i => !i.onPage && i.reason !== null)).toBe(true);
    const missing = evidenceItems(handoff, [], []);
    expect(missing[0]).toEqual({
      alertId: handoff.evidence[0],
      label: handoff.evidence[0],
      reason: null,
      severity: null,
      onPage: false,
    });
  });

  it('logged alert rows that claim another crew are dropped', () => {
    const a = day75.alerts[0]!;
    expect(parseAlertRows([{ ...alertRow(a), crew_id: 'C1' }])).toEqual([]);
  });
});
