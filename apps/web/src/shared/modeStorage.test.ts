import { describe, expect, it } from 'vitest';
import { loadMode, saveMode } from './modeStorage';

function memory() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

const broken = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('mode storage (localStorage)', () => {
  it('first visit: Space; a saved choice comes back', () => {
    const s = memory();
    expect(loadMode(s)).toBe('space');
    saveMode('earth', s);
    expect(loadMode(s)).toBe('earth');
  });

  it('junk in storage is ignored', () => {
    const s = memory();
    s.setItem('somacast.mode', 'mars');
    expect(loadMode(s)).toBe('space');
  });

  it('blocked or missing storage never throws', () => {
    expect(loadMode(broken)).toBe('space');
    expect(() => saveMode('earth', broken)).not.toThrow();
    expect(loadMode(null)).toBe('space');
    expect(() => saveMode('earth', null)).not.toThrow();
    expect(loadMode()).toBe('space'); // node test run: no window
  });
});
