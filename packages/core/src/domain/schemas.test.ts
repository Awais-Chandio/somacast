import { describe, it, expect } from '@jest/globals';
import { ProfileSchema } from './schemas';

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
