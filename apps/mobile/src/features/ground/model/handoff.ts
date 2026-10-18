import {
  assess,
  buildHandoff,
  copy,
  HandoffSchema,
  renderHandoff,
  weather,
  type Handoff,
  type LogEntry,
  type Mode,
  type SimulationResult,
} from '@somacast/core';
import type { AosContact, GroundContact } from '../../link/model/linkPanel';

// The SBAR handoff for the day on screen, as a black-box 'crew_action' entry (payload.type 'handoff').
// One handoff per AOS: the id carries the AOS time, so a resend of the same batch is stored once,
// while the next AOS sends a fresh handoff with its own blackout length.
export function handoffEntry(
  sim: SimulationResult,
  scenario: string,
  crewId: string,
  day: number,
  contact: AosContact,
): LogEntry | null {
  const crew = sim.crew.find(c => c.id === crewId);
  if (!crew) return null;
  const { alerts, forecast } = assess(sim.readings, crewId, day);
  const handoff = buildHandoff(sim.readings, alerts, forecast, crew, {
    id: `handoff-${scenario}-${crewId}-${day}-${Date.parse(contact.aosAt)}`,
    createdAt: contact.aosAt,
    asOfDay: day,
    blackout: { start: contact.losSince, end: contact.aosAt },
    heldEntries: contact.held,
  });
  return {
    id: handoff.id,
    crewId,
    timestamp: handoff.createdAt,
    kind: 'crew_action',
    payload: { type: 'handoff', scenario, state: forecast.state, ...handoff },
  };
}

export function handoffFromEntry(entry: LogEntry): Handoff | null {
  if (entry.kind !== 'crew_action' || entry.payload.type !== 'handoff')
    return null;
  const parsed = HandoffSchema.safeParse(entry.payload);
  return parsed.success ? parsed.data : null;
}

// What the "Handoff sent" card shows, already worded. The situation is re-worded by mode from the
// handoff's facts; the stored text stays in Space wording.
export type HandoffCardView = {
  title: string; // "HANDOFF SENT"
  sentText: string; // "Sent to Supabase at 2026-10-17 14:05 UTC"
  stateWord: string | null; // "Storm"
  situation: string;
  evidenceText: string; // "3 alerts attached as evidence"
  disclaimer: string;
};

export function utcTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function handoffCardView(
  contact: GroundContact,
  mode: Mode = 'space',
): HandoffCardView | null {
  const entry = contact.sent.find(e => handoffFromEntry(e));
  const h = entry && handoffFromEntry(entry);
  if (!entry || !h) return null;
  const state = entry.payload.state;
  const n = h.evidence.length;
  return {
    title: 'HANDOFF SENT',
    sentText: `Sent to ${
      contact.ground === 'supabase' ? 'Supabase' : 'the demo ground'
    } at ${utcTime(h.createdAt)}`,
    stateWord:
      state === 'clear' || state === 'cloudy' || state === 'storm'
        ? weather[state].label
        : null,
    situation: renderHandoff(h, mode).situation,
    evidenceText: `${n === 0 ? 'No' : n} ${
      n === 1 ? 'alert' : 'alerts'
    } attached as evidence. ${copy[mode].reviewRequested}`,
    disclaimer: h.disclaimer,
  };
}
