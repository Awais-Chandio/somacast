import { describe, it, expect } from '@jest/globals';
import { color, theme } from './tokens';
import { contrastRatio } from './contrast';

// Pairs the brand kit approves for small text (minimum 4.5:1).
const approved: Array<[string, string, string]> = [
  ['white on deepBlue', color.white, color.deepBlue],
  ['neonYellow on deepBlue', color.neonYellow, color.deepBlue],
  ['deepBlue on neonYellow', color.deepBlue, color.neonYellow],
  ['blueYonder on deepBlue', color.blueYonder, color.deepBlue],
  ['white on electricBlue', color.white, color.electricBlue],
  ['neonYellow on electricBlue', color.neonYellow, color.electricBlue],
  ['white on martianRed', color.white, color.martianRed],
  ['white on neonBlue', color.white, color.neonBlue],
];

describe('brand contrast (NFR-004)', () => {
  it.each(approved)('%s is at least 4.5:1', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('matches the known value for white on deepBlue', () => {
    expect(contrastRatio(color.white, color.deepBlue)).toBeCloseTo(17.45, 1);
  });

  it('rocketRed is large-text only (white on it is below 4.5:1)', () => {
    expect(contrastRatio(color.white, color.rocketRed)).toBeLessThan(4.5);
  });

  it('the theme text and bg pair passes', () => {
    expect(contrastRatio(theme.text, theme.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
