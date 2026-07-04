// src/features/scan/match.test.ts
import { describe, it, expect } from 'vitest';
import { scoreDescriptors, matchTile } from './match';
import type { Descriptor, ReferenceEntry } from './types';

function desc(seed: number): Descriptor {
  return {
    dhash: seed.toString(16).padStart(16, '0'),
    rgb16: new Array(768).fill(seed % 256),
    sil8: new Array(64).fill(seed % 2),
    edge8: new Array(64).fill(seed % 128),
  };
}

describe('scoreDescriptors', () => {
  it('scores an identical descriptor at 1.0', () => {
    const d = desc(43);
    expect(scoreDescriptors(d, d)).toBeCloseTo(1, 6);
  });
});

describe('matchTile', () => {
  it('returns the exact-match id first', () => {
    const refs: ReferenceEntry[] = [
      { id: 1, desc: desc(1) }, { id: 25, desc: desc(25) }, { id: 6, desc: desc(6) },
    ];
    const out = matchTile(desc(25), refs, 3);
    expect(out[0].id).toBe(25);
    expect(out.length).toBe(3);
  });

  it('dedups multiple descriptors for the same id, keeping the better score', () => {
    const refs: ReferenceEntry[] = [
      { id: 25, desc: desc(25) },       // exact match for query desc(25) -> highest score
      { id: 25, desc: desc(99) },       // worse match, same id
      { id: 1, desc: desc(1) },
      { id: 6, desc: desc(6) },
    ];
    const out = matchTile(desc(25), refs, 3);
    const id25Entries = out.filter((c) => c.id === 25);
    expect(id25Entries.length).toBe(1);
    expect(id25Entries[0].score).toBeCloseTo(1, 6);
    // topN counts unique ids, not raw entries
    const uniqueIds = new Set(out.map((c) => c.id));
    expect(uniqueIds.size).toBe(out.length);
    expect(out.length).toBe(3);
  });
});
