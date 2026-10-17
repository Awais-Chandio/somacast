import { metrics, type MetricId } from '../domain/metrics';

// Earth mode (REQ-019): the same engine, worded for a remote team on Earth instead of a crew in space.
// Only words change. Thresholds, rules, alerts and the log stay exactly the same in both modes.
// Engine-written sentences (alert reasons, forecast reasons, coach actions, the SBAR handoff) are part
// of the shared log, so they keep the Space wording; see docs/earth-mode.md.

export const modes = ['space', 'earth'] as const;
export type Mode = (typeof modes)[number];

const space = {
  modeName: 'Space',
  tagline: 'Body weather for crews beyond Earth',
  // link to the ground
  linkDown: 'LOS', // loss of signal
  linkUp: 'AOS', // acquisition of signal
  linkDownHint: 'no signal',
  linkUpHint: 'signal',
  whileDown: 'in LOS', // "Works only in LOS"
  atLinkUp: 'at AOS', // "Made at AOS"
  nextLinkUp: 'at the next AOS', // "Notes ... arrive at the next AOS"
  eachLinkUp: 'at each AOS',
  firstLinkUp: 'first AOS', // "after a crew's first AOS"
  linkGap: 'LOS gap',
  // people
  member: 'crew member',
  members: 'crew members',
  team: 'crew', // "Crew C1", "this crew"
  teams: 'crews',
  doctor: 'flight surgeon',
  doctors: 'flight surgeons',
  day: 'mission day', // "as of mission day 75"
  // environment
  co2Label: metrics.cabinCo2.label,
};

export type Copy = Record<keyof typeof space, string>;

const earth: Copy = {
  modeName: 'Earth',
  tagline: 'Body weather for teams far from a clinic',
  linkDown: 'Offline',
  linkUp: 'Back online',
  linkDownHint: 'no connection',
  linkUpHint: 'connected',
  whileDown: 'while offline',
  atLinkUp: 'when back online',
  nextLinkUp: 'when the link is back online',
  eachLinkUp: 'each time it is back online',
  firstLinkUp: 'first time back online',
  linkGap: 'Offline gap',
  member: 'team member',
  members: 'team members',
  team: 'team',
  teams: 'teams',
  doctor: 'remote doctor',
  doctors: 'remote doctors',
  day: 'day',
  co2Label: 'Indoor CO2 partial pressure',
};

export const copy: Record<Mode, Copy> = { space, earth };

// The label a screen shows for a metric. Only CO2 changes with the mode ("cabin" vs "indoor").
export function metricLabel(metric: MetricId, words: Copy = space): string {
  return metric === 'cabinCo2' ? words.co2Label : metrics[metric].label;
}

// "flight surgeon" -> "Flight surgeon"
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
