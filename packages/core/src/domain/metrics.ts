// Metric catalogue. Every number here is SIMULATED.
// "published" means the baseline is anchored to a published figure; "guess" means it is our own
// illustrative choice (illustrative, expert review required).

export const metricIds = [
  'restingHr',
  'hrv',
  'sleepHours',
  'exerciseMin',
  'cabinCo2',
  'radiationDose',
  'psychCheckin',
] as const;

export type MetricId = (typeof metricIds)[number];

export type MetricSpec = {
  id: MetricId;
  label: string;
  unit: string;
  scope: 'personal' | 'environment'; // personal = one value per crew member, environment = shared by the cabin
  baselineMean: number;
  betweenSd: number; // spread between crew members (personal metrics only)
  withinSd: number; // day-to-day noise
  source: 'published' | 'guess';
  note: string;
};

export const metrics: Record<MetricId, MetricSpec> = {
  restingHr: {
    id: 'restingHr',
    label: 'Resting heart rate',
    unit: 'bpm',
    scope: 'personal',
    baselineMean: 62,
    betweenSd: 6,
    withinSd: 2.5,
    source: 'guess',
    note: 'Real astronaut HR series are not public, so this is simulated.',
  },
  hrv: {
    id: 'hrv',
    label: 'Heart rate variability (rMSSD)',
    unit: 'ms',
    scope: 'personal',
    baselineMean: 55,
    betweenSd: 10,
    withinSd: 6,
    source: 'guess',
    note: 'Real astronaut HRV series are not public, so this is simulated.',
  },
  sleepHours: {
    id: 'sleepHours',
    label: 'Sleep duration',
    unit: 'h',
    scope: 'personal',
    baselineMean: 6.09,
    betweenSd: 0.3,
    withinSd: 0.5,
    source: 'published',
    note: 'ISS mean 6.09 h (Barger et al. 2014); 1,294 of 2,951 ISS nights were under 6 h. The two spreads are tuned so about 44% of simulated nights fall under 6 h.',
  },
  exerciseMin: {
    id: 'exerciseMin',
    label: 'Exercise',
    unit: 'min/day',
    scope: 'personal',
    baselineMean: 120,
    betweenSd: 15,
    withinSd: 15,
    source: 'guess',
    note: 'Daily exercise is required on the ISS (JAXA). The exact daily minutes are unverified, so this is a guess. A weekly rest day lowers the mean.',
  },
  cabinCo2: {
    id: 'cabinCo2',
    label: 'Cabin CO2 partial pressure',
    unit: 'mmHg',
    scope: 'environment',
    baselineMean: 2.0,
    betweenSd: 0,
    withinSd: 0.3,
    source: 'published',
    note: 'NASA: 24 h average at or below 3 mmHg; the 7-day average on the ISS ranged from 1 to 9 mmHg. Our baseline of 2.0 mmHg is a guess inside that range.',
  },
  radiationDose: {
    id: 'radiationDose',
    label: 'Daily radiation dose',
    unit: 'mSv/day',
    scope: 'environment',
    baselineMean: 0.5,
    betweenSd: 0,
    withinSd: 0.05,
    source: 'guess',
    note: 'Baseline is a guess with no source yet. Solar particle event dates come from NASA DONKI (added later).',
  },
  psychCheckin: {
    id: 'psychCheckin',
    label: 'Psych check-in',
    unit: '1 to 5',
    scope: 'personal',
    baselineMean: 4,
    betweenSd: 0.3,
    withinSd: 0.6,
    source: 'guess',
    note: 'Self-rated mood, 5 is best. Rounded to a whole number.',
  },
};
