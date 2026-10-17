import type { scenarios } from '@somacast/core';

// Fixed settings for the simulated demo mission. Same seed = same simulated data on every launch.
export const MISSION = {
  seed: 42,
  crewCount: 4,
  days: 90,
  startDate: '2027-01-01',
} as const;

export const DEFAULT_CREW_ID = 'C1';

export type ScenarioKey = keyof typeof scenarios;

export const SCENARIO_OPTIONS: readonly { key: ScenarioKey; label: string }[] =
  [
    { key: 'normal', label: 'Normal' },
    { key: 'blackoutDecline', label: 'Blackout' },
    { key: 'solarStorm', label: 'Solar storm' },
  ];
