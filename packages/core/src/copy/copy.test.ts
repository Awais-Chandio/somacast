import { describe, it, expect } from '@jest/globals';
import {
  capitalize,
  copy,
  metricIds,
  metricLabel,
  metrics,
  modes,
} from '../index';

describe('copy (Space / Earth wording, REQ-019)', () => {
  it('both modes have exactly the same keys', () => {
    expect(Object.keys(copy.earth).sort()).toEqual(
      Object.keys(copy.space).sort(),
    );
    expect(Object.keys(copy).sort()).toEqual([...modes].sort());
  });

  it('every entry is a non-empty string', () => {
    for (const mode of modes)
      for (const [key, value] of Object.entries(copy[mode])) {
        expect([mode, key, typeof value]).toEqual([mode, key, 'string']);
        expect(value.trim()).not.toBe('');
        expect(value).toBe(value.trim());
      }
  });

  it('Earth wording has no space jargon', () => {
    const jargon = /\b(LOS|AOS|crews?|flight surgeons?|cabin|mission)\b/i;
    for (const [key, value] of Object.entries(copy.earth))
      expect([key, jargon.test(value)]).toEqual([key, false]);
  });

  it('the asked-for swaps', () => {
    expect([copy.space.linkDown, copy.earth.linkDown]).toEqual([
      'LOS',
      'Offline',
    ]);
    expect([copy.space.linkUp, copy.earth.linkUp]).toEqual([
      'AOS',
      'Back online',
    ]);
    expect([copy.space.member, copy.earth.member]).toEqual([
      'crew member',
      'team member',
    ]);
    expect([copy.space.doctor, copy.earth.doctor]).toEqual([
      'flight surgeon',
      'remote doctor',
    ]);
    expect(copy.earth.co2Label).toMatch(/^Indoor CO2/);
  });

  it('metricLabel: Space is the catalogue label; Earth only renames CO2', () => {
    for (const m of metricIds) {
      expect(metricLabel(m)).toBe(metrics[m].label);
      expect(metricLabel(m, copy.space)).toBe(metrics[m].label);
      if (m !== 'cabinCo2')
        expect(metricLabel(m, copy.earth)).toBe(metrics[m].label);
    }
    expect(metricLabel('cabinCo2', copy.earth)).toBe(
      'Indoor CO2 partial pressure',
    );
  });

  it('capitalize', () => {
    expect(capitalize('flight surgeon')).toBe('Flight surgeon');
    expect(capitalize('')).toBe('');
  });
});
