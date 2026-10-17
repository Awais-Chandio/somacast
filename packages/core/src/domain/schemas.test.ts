import { describe, it, expect } from '@jest/globals';
import { metricIds } from './metrics';
import { ProfileSchema, ReadingSchema } from './schemas';

// NFR-003: a broken sensor value is refused at the schema instead of reaching the engine or the log.
describe('ReadingSchema: NaN, infinite and negative input', () => {
  const ok = {
    crewId: 'C1',
    day: 3,
    date: '2027-01-04',
    restingHr: 58,
    hrv: 62,
    sleepHours: 6.1,
    exerciseMin: 120,
    cabinCo2: 2.4,
    radiationDose: 0.5,
    psychCheckin: 4,
    simulated: true,
  };

  it('accepts a normal reading', () => {
    expect(ReadingSchema.safeParse(ok).success).toBe(true);
  });

  it.each(metricIds)('%s: rejects NaN, Infinity and negative values', m => {
    for (const bad of [NaN, Infinity, -Infinity, -1])
      expect([
        bad,
        ReadingSchema.safeParse({ ...ok, [m]: bad }).success,
      ]).toEqual([bad, false]);
  });

  it('rejects a negative or fractional day', () => {
    expect(ReadingSchema.safeParse({ ...ok, day: -1 }).success).toBe(false);
    expect(ReadingSchema.safeParse({ ...ok, day: 1.5 }).success).toBe(false);
  });
});

describe('ProfileSchema', () => {
  const crew = {
    userId: 'u1',
    role: 'crew',
    crewId: 'C1',
    displayName: 'Maya',
  };

  it('accepts a crew account with a crew and a surgeon without one', () => {
    expect(ProfileSchema.safeParse(crew).success).toBe(true);
    expect(
      ProfileSchema.safeParse({ ...crew, role: 'surgeon', crewId: null })
        .success,
    ).toBe(true);
  });

  it('rejects a crew account without a crew', () => {
    expect(ProfileSchema.safeParse({ ...crew, crewId: null }).success).toBe(
      false,
    );
  });

  it('rejects an unknown role', () => {
    expect(ProfileSchema.safeParse({ ...crew, role: 'admin' }).success).toBe(
      false,
    );
  });
});
