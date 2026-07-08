import { describe, it, expect } from 'vitest';
import { opponentIdsFromEntries, type ScanEntry } from './index';

const entry = (id: number | null): ScanEntry => ({ id, candidates: [] });

describe('opponentIdsFromEntries', () => {
  it('keeps non-null ids and drops empty slots', () => {
    expect(opponentIdsFromEntries([entry(445), entry(null), entry(823)])).toEqual([445, 823]);
  });

  it('deduplicates repeated species', () => {
    expect(opponentIdsFromEntries([entry(445), entry(445), entry(1000)])).toEqual([445, 1000]);
  });

  it('returns an empty array when nothing is identified', () => {
    expect(opponentIdsFromEntries([entry(null), entry(null)])).toEqual([]);
  });
});
