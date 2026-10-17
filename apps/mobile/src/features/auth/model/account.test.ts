import { copy } from '@somacast/core';
import {
  accountLabel,
  crewProblem,
  signInProblem,
  toAccount,
  type Account,
} from './account';

const user = { id: 'u-maya', email: 'maya@somacast.test' };

describe('auth model', () => {
  it('maps a profiles row to an account', () => {
    expect(
      toAccount(user, { role: 'crew', crew_id: 'C1', display_name: 'Maya' }),
    ).toEqual({
      userId: 'u-maya',
      email: 'maya@somacast.test',
      role: 'crew',
      crewId: 'C1',
      displayName: 'Maya',
    });
  });

  it('refuses a crew profile without a crew', () => {
    expect(() =>
      toAccount(user, { role: 'crew', crew_id: null, display_name: null }),
    ).toThrow('a crew account needs a crew_id');
  });

  it('checks the form before any network call', () => {
    expect(signInProblem('maya', 'x')).toBe('Enter a valid email.');
    expect(signInProblem(' maya@somacast.test ', '')).toBe(
      'Enter your password.',
    );
    expect(signInProblem('maya@somacast.test', 'pw')).toBeNull();
  });

  it('a crew account must belong to the simulated mission', () => {
    const maya: Account = {
      ...user,
      userId: user.id,
      role: 'crew',
      crewId: 'C1',
      displayName: 'Maya',
    };
    expect(crewProblem(maya, ['C1', 'C2'])).toBeNull();
    expect(crewProblem({ ...maya, crewId: 'C9' }, ['C1', 'C2'])).toBe(
      'Crew C9 is not part of this simulated mission.',
    );
    expect(
      crewProblem({ ...maya, role: 'surgeon', crewId: null }, []),
    ).toBeNull();
  });

  it('labels the account by name and role', () => {
    const maya: Account = {
      ...user,
      userId: user.id,
      role: 'crew',
      crewId: 'C1',
      displayName: 'Maya',
    };
    expect(accountLabel(maya)).toBe('Maya, crew C1');
    expect(
      accountLabel({
        ...maya,
        role: 'surgeon',
        crewId: null,
        displayName: null,
      }),
    ).toBe('maya@somacast.test, flight surgeon');
  });

  it('Earth wording: team and remote doctor', () => {
    const maya: Account = {
      ...user,
      userId: user.id,
      role: 'crew',
      crewId: 'C1',
      displayName: 'Maya',
    };
    expect(accountLabel(maya, copy.earth)).toBe('Maya, team C1');
    expect(
      accountLabel({ ...maya, role: 'surgeon', crewId: null }, copy.earth),
    ).toBe('Maya, remote doctor');
  });
});
