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

// Demo accounts: which simulated scenario each signed-in crew member lives in, and the mission day
// the demo opens on. The black box records every day 0..day of that scenario after sign-in.
export type DemoMission = { scenario: ScenarioKey; day: number };

export const DEMO_MISSIONS: Readonly<Record<string, DemoMission>> = {
  'maya@somacast.test': { scenario: 'normal', day: 89 }, // C1
  'kenji@somacast.test': { scenario: 'blackoutDecline', day: 75 }, // C2, Storm on day 75
};

// Any other account: the normal scenario on the last mission day.
export function demoMissionFor(email: string | null | undefined): DemoMission {
  const known = email ? DEMO_MISSIONS[email.trim().toLowerCase()] : undefined;
  return known ?? { scenario: 'normal', day: MISSION.days - 1 };
}
