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
});

describe('filterByFormatLegal', () => {
  it('keeps only ids in the legal set', () => {
    const refs = parseReferenceMap({ '25': d, '6': d, '9999': d });
    const out = filterByFormatLegal(refs, new Set([25, 6]));
    expect(out.map((r) => r.id).sort((a, b) => a - b)).toEqual([6, 25]);
  });
});
