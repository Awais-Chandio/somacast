import { createRng } from './rng';
import { metrics, type MetricId } from '../domain/metrics';
import type { Crew, DailyReading, Effect, Scenario } from '../domain/schemas';

const CREW_NAMES = ['Maya', 'Kenji', 'Amara', 'Luis'];
const PERSONAL: MetricId[] = [
  'restingHr',
  'hrv',
  'sleepHours',
  'exerciseMin',
  'psychCheckin',
];

export type SimulationOptions = {
  seed: number;
  crewCount: number;
  days: number;
  startDate: string; // YYYY-MM-DD
  scenario: Scenario;
};

export type SimulationResult = {
  crew: Crew[];
  readings: DailyReading[];
};

function addDays(startDate: string, day: number): string {
  const [y, m, d] = startDate.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(y, m - 1, d + day));
  return date.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// How much a scenario shifts one metric for one crew member on one day.
export function effectDelta(
  effects: Effect[],
  metric: MetricId,
  crewId: string,
  day: number,
): number {
  let total = 0;
  for (const e of effects) {
    if (e.metric !== metric) continue;
    if (e.crew !== 'all' && !e.crew.includes(crewId)) continue;
    if (day < e.startDay || day > e.endDay) continue;
    if (e.kind === 'step') {
      total += e.delta;
    } else {
      total += (e.delta * (day - e.startDay + 1)) / (e.endDay - e.startDay + 1);
    }
  }
  return total;
}

// Same seed gives the same data. Random numbers are drawn in a fixed order that does not depend on
// the scenario, so two scenarios with the same seed differ only by the scenario's effects.
export function simulate(options: SimulationOptions): SimulationResult {
  const { seed, crewCount, days, startDate, scenario } = options;
  const rng = createRng(seed);

  const crew: Crew[] = [];
  const personalMean: Record<string, Record<string, number>> = {};
  for (let i = 0; i < crewCount; i++) {
    const id = `C${i + 1}`;
    crew.push({ id, name: CREW_NAMES[i] ?? `Crew ${i + 1}` });
    const means: Record<string, number> = {};
    for (const metric of PERSONAL) {
      const spec = metrics[metric];
      means[metric] = rng.normal(spec.baselineMean, spec.betweenSd);
    }
    personalMean[id] = means;
  }

  const readings: DailyReading[] = [];
  for (let day = 0; day < days; day++) {
    const co2 = rng.normal(
      metrics.cabinCo2.baselineMean,
      metrics.cabinCo2.withinSd,
    );
    const dose = rng.normal(
      metrics.radiationDose.baselineMean,
      metrics.radiationDose.withinSd,
    );
    const restDay = day % 7 === 6;

    for (const member of crew) {
      const means = personalMean[member.id] as Record<string, number>;
      const noisy = (metric: MetricId, mean: number): number =>
        rng.normal(mean, metrics[metric].withinSd);

      const hr = noisy('restingHr', means.restingHr as number);
      const hrv = noisy('hrv', means.hrv as number);
      const sleep = noisy('sleepHours', means.sleepHours as number);
      const exerciseMean = (means.exerciseMin as number) * (restDay ? 0.4 : 1);
      const exercise = noisy('exerciseMin', exerciseMean);
      const psych = noisy('psychCheckin', means.psychCheckin as number);

      const d = (metric: MetricId): number =>
        effectDelta(scenario.effects, metric, member.id, day);

      readings.push({
        crewId: member.id,
        day,
        date: addDays(startDate, day),
        restingHr: round2(clamp(hr + d('restingHr'), 30, 200)),
        hrv: round2(clamp(hrv + d('hrv'), 5, 200)),
        sleepHours: round2(clamp(sleep + d('sleepHours'), 0, 14)),
        exerciseMin: round2(clamp(exercise + d('exerciseMin'), 0, 400)),
        cabinCo2: round2(clamp(co2 + d('cabinCo2'), 0.3, 20)),
        radiationDose: round2(clamp(dose + d('radiationDose'), 0, 50)),
        psychCheckin: Math.round(clamp(psych + d('psychCheckin'), 1, 5)),
        simulated: true,
      });
    }
  }

  return { crew, readings };
}
