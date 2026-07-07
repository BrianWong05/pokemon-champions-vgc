import { describe, it, expect } from 'vitest';
import { flattenDamage } from './damage-calc';

describe('flattenDamage', () => {
  it('returns [0] for an empty array', () => {
    expect(flattenDamage([])).toEqual([0]);
  });

  it('filters to numbers for a flat single-hit array', () => {
    expect(flattenDamage([12, 14, 16])).toEqual([12, 14, 16]);
  });

  it('sums first and last elements per sub-array for multi-hit damage', () => {
    expect(flattenDamage([[10, 12], [10, 14]])).toEqual([20, 26]);
  });
});
