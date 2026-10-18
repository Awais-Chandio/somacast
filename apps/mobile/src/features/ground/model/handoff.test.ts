import {
  HandoffSchema,
  LogEntrySchema,
  idempotencyKey,
  isMedicationAdvice,
} from '@somacast/core';
import { simulateMission } from '../../../shared/model/simulateMission';
import type { AosContact } from '../../link/model/linkPanel';
import { handoffCardView, handoffEntry, handoffFromEntry } from './handoff';

const sim = simulateMission('blackoutDecline');
const contact: AosContact = {
  losSince: '2026-10-17T13:58:00.000Z',
  aosAt: '2026-10-17T14:05:30.000Z',
  held: 312,
};

describe('handoffEntry (Kenji, blackout decline, day 75)', () => {
  const entry = handoffEntry(sim, 'blackoutDecline', 'C2', 75, contact)!;

  it("is a valid 'crew_action' log entry with payload.type 'handoff'", () => {
    expect(LogEntrySchema.safeParse(entry).success).toBe(true);
    expect(entry.kind).toBe('crew_action');
    expect(entry.crewId).toBe('C2');
    expect(entry.payload.type).toBe('handoff');
    expect(entry.payload.scenario).toBe('blackoutDecline');
    expect(entry.timestamp).toBe(contact.aosAt);
  });

  it('carries a full SBAR handoff that matches HandoffSchema', () => {
    const h = handoffFromEntry(entry)!;
    expect(HandoffSchema.safeParse(h).success).toBe(true);
    expect(h.situation).toMatch(/^Kenji \(C2\), mission day 75: Storm/);
    expect(h.background).toContain('Out of contact (LOS) for 8 min');
    expect(h.background).toContain('312 log entries');
    expect(h.recommendation).toMatch(/Ground review requested\.$/);
    expect(h.evidence.length).toBeGreaterThan(0);
    expect(isMedicationAdvice(h.recommendation)).toBe(false);
  });

  it('one handoff per AOS: same AOS, same key; next AOS, new key', () => {
    const again = handoffEntry(sim, 'blackoutDecline', 'C2', 75, contact)!;
    expect(idempotencyKey(again)).toBe(idempotencyKey(entry));
    const later = handoffEntry(sim, 'blackoutDecline', 'C2', 75, {
      ...contact,
      aosAt: '2026-10-17T15:00:00.000Z',
    })!;
    expect(idempotencyKey(later)).not.toBe(idempotencyKey(entry));
  });

  it('unknown crew: no handoff', () => {
    expect(handoffEntry(sim, 'blackoutDecline', 'ZZ-TEST', 75, contact)).toBe(
      null,
    );
  });

  it('card view: words, not colour', () => {
    const v = handoffCardView({
      ...contact,
      ground: 'supabase',
      sent: [entry],
    })!;
    expect(v.title).toBe('HANDOFF SENT');
    expect(v.sentText).toBe('Sent to Supabase at 2026-10-17 14:05 UTC');
    expect(v.stateWord).toBe('Storm');
    expect(v.evidenceText).toMatch(
      /^\d+ alerts attached as evidence\. Ground review requested\.$/,
    );
    expect(v.disclaimer).toBe('Decision support only, not a medical device.');
  });

  it('card view in Earth wording: re-worded from the facts, stored text unchanged', () => {
    const sent = { ...contact, ground: 'supabase' as const, sent: [entry] };
    const space = handoffCardView(sent, 'space')!;
    const earth = handoffCardView(sent, 'earth')!;
    expect(space.situation).toBe(entry.payload.situation); // the stored text
    expect(space.situation).toMatch(/mission day 75/);
    expect(earth.situation).toMatch(/^Kenji \(C2\), day 75: Storm forecast/);
    expect(earth.evidenceText).toMatch(/Remote doctor review requested\.$/);
    expect(entry.payload.situation).toBe(space.situation);
  });

  it('card view: nothing when no handoff was sent', () => {
    expect(handoffCardView({ ...contact, ground: 'demo', sent: [] })).toBe(
      null,
    );
  });
});
