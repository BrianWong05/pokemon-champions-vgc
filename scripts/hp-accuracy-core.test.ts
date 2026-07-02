import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { sweep, loadPng, readingToString, type GoldenFile } from './hp-accuracy-core';

describe('readingToString', () => {
  it('formats percent and fraction readings', () => {
    expect(readingToString({ percent: 29 })).toBe('29%');
    expect(readingToString({ percent: 40, current: 81, max: 202 })).toBe('81/202');
    expect(readingToString(null)).toBeNull();
  });
});

describe('sweep', () => {
  it('pairs golden entries with detected panels and counts reads/wrongs', () => {
    const golden: GoldenFile = {
      'Xnip2026-07-01_19-38-20.png': { opponent: ['29%', '1%'], player: ['81/202', '193/193'] },
    };
    const summary = sweep(golden, (n) => loadPng(path.join('training/screenshots', n)));
    expect(summary.results.length).toBe(4);
    expect(summary.readable).toBe(4);
    expect(summary.wrong).toBe(0); // policy A: whatever recall is, wrong must be 0
  }, 120_000);

  it('throws loudly when panel count and golden length disagree', () => {
    const golden: GoldenFile = {
      'Xnip2026-07-01_19-38-20.png': { opponent: ['29%'], player: [] },
    };
    expect(() => sweep(golden, (n) => loadPng(path.join('training/screenshots', n)))).toThrow(/panels/);
  }, 120_000);
});
