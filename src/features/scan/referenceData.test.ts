// src/features/scan/referenceData.test.ts
import { describe, it, expect } from 'vitest';
import { parseReferenceMap, filterByFormatLegal } from './referenceData';
import type { Descriptor } from './types';

const d: Descriptor = { dhash: '0000000000000000', rgb16: [], sil8: [], edge8: [] };

describe('parseReferenceMap', () => {
  it('converts a string-keyed map to numeric-id entries', () => {
    const refs = parseReferenceMap({ '25': d, '10025': d });
    expect(refs.map((r) => r.id).sort((a, b) => a - b)).toEqual([25, 10025]);
  });

  it('expands an id mapped to an array of descriptors into one entry per descriptor', () => {
    const d2: Descriptor = { dhash: '1111111111111111', rgb16: [], sil8: [], edge8: [] };
    const refs = parseReferenceMap({ '6': [d, d2] });
    expect(refs.length).toBe(2);
    expect(refs.every((r) => r.id === 6)).toBe(true);
    expect(refs.map((r) => r.desc)).toEqual([d, d2]);
  });
});

describe('filterByFormatLegal', () => {
  it('keeps only ids in the legal set', () => {
    const refs = parseReferenceMap({ '25': d, '6': d, '9999': d });
    const out = filterByFormatLegal(refs, new Set([25, 6]));
    expect(out.map((r) => r.id).sort((a, b) => a - b)).toEqual([6, 25]);
  });
});
