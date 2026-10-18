import { coachRules } from '../coach/coach';
import { metrics, type MetricId } from '../domain/metrics';

// Earth mode (REQ-019): the same engine, worded for a remote team on Earth instead of a crew in space.
// Only words change. Thresholds, rules, alerts and the log stay exactly the same in both modes.
// The log stores engine sentences in Space wording; screens re-word them from the structured fields
// with these words (see copy/engineText.ts and docs/earth-mode.md).

export const modes = ['space', 'earth'] as const;
export type Mode = (typeof modes)[number];

// For a mode read back from storage: anything else is ignored.
export function isMode(v: unknown): v is Mode {
  return modes.includes(v as Mode);
}

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
  // SBAR handoff sentences
  outOfContact: 'Out of contact (LOS)', // "... for 3 h 20 min, <start> to <end>."
  noBlackout: 'No blackout before this handoff.',
  reviewRequested: 'Ground review requested.',
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
  outOfContact: 'Offline',
  noBlackout: 'No offline gap before this handoff.',
  reviewRequested: 'Remote doctor review requested.',
};

export const copy: Record<Mode, Copy> = { space, earth };

// Coach action text per mode, one per metric. Space is the coach rule itself (coach/coach.ts);
// Earth says the same thing for a team on Earth. ILLUSTRATIVE wording, expert review required.
// Behaviour and scheduling only, never a medication (copy.test.ts checks both modes).
export const coachText: Record<Mode, Record<MetricId, string>> = {
  space: coachRules,
  earth: {
    sleepHours:
      'Protect your next sleep window; ask the on-site medic about the schedule.',
    restingHr:
      'Recheck resting heart rate at your next morning reading; tell the on-site medic if it stays high.',
    hrv: 'Keep the next work block lighter if the schedule allows; mention it at your next check-in with the on-site medic.',
    exerciseMin:
      'Put your exercise session back on the schedule; ask the on-site medic if something is in the way.',
    psychCheckin:
      'Take some private time or book a private call home; talk to the on-site medic if it helps.',
    cabinCo2:
      'Tell the team and the remote doctor about the CO2 reading; follow the site procedure for indoor air.',
    radiationDose:
      'Follow the site procedure for the radiation reading; ask the on-site medic about limiting exposure.',
  },
};

// The label a screen shows for a metric. Only CO2 changes with the mode ("cabin" vs "indoor").
export function metricLabel(metric: MetricId, words: Copy = space): string {
  return metric === 'cabinCo2' ? words.co2Label : metrics[metric].label;
}

// "flight surgeon" -> "Flight surgeon"
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
