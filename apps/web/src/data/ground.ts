import {
  assess,
  baselineFor,
  indexByDay,
  metricIds,
  ReadingSchema,
  simulatedCrewName,
  type Assessment,
  type DailyReading,
  type MetricId,
} from '@somacast/core';

// Pure data shaping for the ground console: Supabase rows in, what the screens show out.
// No React, no network. The forecast is always recomputed here with core assess() from the synced
// readings; the console never trusts a stored state or a stored alert.

// What the console reads from log_entries. received_at is set by the database on arrival.
export type IndexRow = { crew_id: string; received_at: string };
export type ReadingRow = {
  key: string;
  crew_id: string;
  received_at: string;
  payload: Record<string, unknown>;
};

// Test crews (rls-check probes, fixtures) never reach the surgeon's screens.
export const isTestCrew = (crewId: string) => crewId.startsWith('ZZ-');

// A gap of at least this long with no row received counts as no contact (illustrative, not an ops rule).
export const LOS_GAP_MS = 15 * 60 * 1000;
export const SPARK_DAYS = 14;

export type CrewSummary = {
  crewId: string;
  name: string;
  rows: number; // every row received, including the demo backlog
  lastReceived: string; // ISO time of the newest row
};

// One summary per crew_id found in log_entries, test crews hidden, sorted by crew id.
export function summarizeCrews(rows: IndexRow[]): CrewSummary[] {
  const by = new Map<string, CrewSummary>();
  for (const r of rows) {
    if (isTestCrew(r.crew_id)) continue;
    const s = by.get(r.crew_id);
    if (!s)
      by.set(r.crew_id, {
        crewId: r.crew_id,
        name: crewName(r.crew_id),
        rows: 1,
        lastReceived: r.received_at,
      });
    else {
      s.rows++;
      if (Date.parse(r.received_at) > Date.parse(s.lastReceived))
        s.lastReceived = r.received_at;
    }
  }
  return [...by.values()].sort((a, b) =>
    a.crewId.localeCompare(b.crewId, 'en', { numeric: true }),
  );
}

export function crewName(crewId: string): string {
  return simulatedCrewName(crewId) ?? crewId;
}

// One crew's readings from one simulated scenario. Each scenario is a separate simulated mission
// with its own day numbers, so readings from different scenarios are never mixed.
export type CrewReadings = {
  crewId: string;
  scenario: string;
  readings: DailyReading[]; // sorted by day, one per day
  skipped: number; // reading rows that were not a valid daily reading (e.g. the demo backlog)
};

// Turns reading rows into validated DailyReadings, per crew. For each crew the scenario of the most
// recently received reading wins. Same day twice: the later arrival wins. A row whose payload names
// another crew than its crew_id (the RLS-checked column) is skipped.
export function rowsToReadings(rows: ReadingRow[]): Map<string, CrewReadings> {
  type Bucket = Map<number, { r: DailyReading; at: number }>;
  const perCrew = new Map<
    string,
    {
      scenarios: Map<string, { days: Bucket; latest: number }>;
      skipped: number;
    }
  >();

  for (const row of rows) {
    if (isTestCrew(row.crew_id)) continue;
    let crew = perCrew.get(row.crew_id);
    if (!crew) {
      crew = { scenarios: new Map(), skipped: 0 };
      perCrew.set(row.crew_id, crew);
    }
    const { scenario, ...rest } = row.payload;
    const parsed = ReadingSchema.safeParse(rest);
    if (!parsed.success || parsed.data.crewId !== row.crew_id) {
      crew.skipped++;
      continue;
    }
    const name = typeof scenario === 'string' ? scenario : 'unknown';
    const at = Date.parse(row.received_at);
    let sc = crew.scenarios.get(name);
    if (!sc) {
      sc = { days: new Map(), latest: at };
      crew.scenarios.set(name, sc);
    }
    sc.latest = Math.max(sc.latest, at);
    const prev = sc.days.get(parsed.data.day);
    if (!prev || at >= prev.at)
      sc.days.set(parsed.data.day, { r: parsed.data, at });
  }

  const out = new Map<string, CrewReadings>();
  for (const [crewId, crew] of perCrew) {
    let best: [string, { days: Bucket; latest: number }] | null = null;
    for (const entry of crew.scenarios)
      if (!best || entry[1].latest > best[1].latest) best = entry;
    out.set(crewId, {
      crewId,
      scenario: best?.[0] ?? 'none',
      readings: best
        ? [...best[1].days.values()].map(v => v.r).sort((a, b) => a.day - b.day)
        : [],
      skipped: crew.skipped,
    });
  }
  return out;
}

export type CrewAssessment = Assessment & {
  asOfDay: number;
  asOfDate: string;
  scenario: string;
  readingDays: number;
};

// The 72 h forecast and alerts as of the newest synced day. null when there is no valid reading yet.
export function assessCrew(
  cr: CrewReadings | undefined,
): CrewAssessment | null {
  const last = cr?.readings.at(-1);
  if (!cr || !last) return null;
  return {
    ...assess(cr.readings, cr.crewId, last.day),
    asOfDay: last.day,
    asOfDate: last.date,
    scenario: cr.scenario,
    readingDays: cr.readings.length,
  };
}

export type SparkPoint = {
  day: number;
  date: string | null;
  value: number | null;
};
export type Spark = {
  metric: MetricId;
  points: SparkPoint[]; // SPARK_DAYS days ending at asOfDay, null where no reading arrived
  usual: number | null; // the personal baseline mean, null while still learning
  latest: number | null;
};

// One 14-day series per metric, ending at the newest synced day.
export function sparklines(
  cr: CrewReadings,
  asOfDay: number,
  days = SPARK_DAYS,
): Spark[] {
  const index = indexByDay(cr.readings, cr.crewId);
  return metricIds.map(metric => {
    const points: SparkPoint[] = [];
    for (let d = asOfDay - days + 1; d <= asOfDay; d++) {
      if (d < 0) continue;
      const r = index.get(d);
      points.push({
        day: d,
        date: r?.date ?? null,
        value: r ? r[metric] : null,
      });
    }
    const b = baselineFor(index, metric, asOfDay);
    return {
      metric,
      points,
      usual: b ? Math.round(b.mean * 100) / 100 : null,
      latest: index.get(asOfDay)?.[metric] ?? null,
    };
  });
}

export type ContactSpan =
  | { kind: 'contact'; from: string; to: string; rows: number }
  | { kind: 'gap'; from: string; to: string; open: boolean }; // open: still no rows now

// Timeline of contact and LOS gaps from the times rows arrived. Rows closer together than minGapMs
// belong to one contact; anything longer with nothing received is a gap. The span from the last
// row to `now` is an open gap once it is long enough.
export function losTimeline(
  receivedAt: string[],
  now: Date,
  minGapMs = LOS_GAP_MS,
): ContactSpan[] {
  const times = receivedAt
    .map(t => Date.parse(t))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const first = times[0];
  if (first === undefined) return [];
  const iso = (ms: number) => new Date(ms).toISOString();
  const out: ContactSpan[] = [];
  let from = first;
  let prev = first;
  let rows = 1;
  for (const t of times.slice(1)) {
    if (t - prev >= minGapMs) {
      out.push({ kind: 'contact', from: iso(from), to: iso(prev), rows });
      out.push({ kind: 'gap', from: iso(prev), to: iso(t), open: false });
      from = t;
      rows = 0;
    }
    rows++;
    prev = t;
  }
  out.push({ kind: 'contact', from: iso(from), to: iso(prev), rows });
  if (now.getTime() - prev >= minGapMs)
    out.push({
      kind: 'gap',
      from: iso(prev),
      to: now.toISOString(),
      open: true,
    });
  return out;
}

export const MAX_NOTE_LENGTH = 2000;

// Checked before sending an uplink note. The text is stored and shown as plain text only.
export function noteProblem(text: string): string | null {
  if (text.trim().length === 0) return 'Write a note first.';
  if (text.length > MAX_NOTE_LENGTH)
    return `Keep the note under ${MAX_NOTE_LENGTH.toLocaleString('en-US')} characters.`;
  return null;
}

// "3 h 20 min", "45 min", "2 d 4 h": length of a gap for the timeline.
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}
