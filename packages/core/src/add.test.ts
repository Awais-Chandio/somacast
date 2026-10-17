import { describe, it, expect } from '@jest/globals';
import { add } from './add';

describe('add', () => {
  it('adds two positive numbers', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('adds negative numbers', () => {
    expect(add(-1, -2)).toBe(-3);
  });
});
