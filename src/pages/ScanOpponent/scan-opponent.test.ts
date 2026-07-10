import { describe, it, expect } from 'vitest';
import {
  assignUniqueCandidates,
  availableCandidatesFor,
  opponentIdsFromEntries,
  unavailableIdsFor,
  updateEntryId,
  type ScanEntry,
} from './roster';
import type { Candidate } from '@/features/scan/types';

const candidates = (...pairs: Array<[number, number]>): Candidate[] =>
  pairs.map(([id, score]) => ({ id, score }));
const entry = (id: number | null, options: Candidate[] = []): ScanEntry => ({ id, candidates: options });

describe('assignUniqueCandidates', () => {
  it('chooses the best overall unique assignment instead of greedy slot order', () => {
    const assigned = assignUniqueCandidates([
      { candidates: candidates([6, 0.9], [25, 0.89]) },
      { candidates: candidates([6, 0.88], [150, 0.1]) },
    ]);
    expect(assigned.map((slot) => slot.id)).toEqual([25, 6]);
  });

  it('leaves a slot empty when every candidate is already used', () => {
    const assigned = assignUniqueCandidates([
      { candidates: candidates([6, 0.9]) },
      { candidates: candidates([6, 0.8]) },
    ]);
    expect(assigned.map((slot) => slot.id)).toEqual([6, null]);
  });
});

describe('manual uniqueness', () => {
  const entries = [
    entry(6, candidates([6, 0.9], [25, 0.2])),
    entry(94, candidates([6, 0.8], [94, 0.7])),
  ];

  it('reserves IDs owned by other slots but keeps the current ID available', () => {
    expect([...unavailableIdsFor(entries, 0)]).toEqual([94]);
    expect(availableCandidatesFor(entries, 1).map((candidate) => candidate.id)).toEqual([94]);
  });

  it('rejects a duplicate manual selection without clearing its owner', () => {
    expect(updateEntryId(entries, 1, 6)).toBe(entries);
    expect(updateEntryId(entries, 0, null).map((slot) => slot.id)).toEqual([null, 94]);
  });
});

describe('opponentIdsFromEntries', () => {
  it('keeps unique non-null ids and drops empty slots', () => {
    expect(opponentIdsFromEntries([entry(445), entry(null), entry(445), entry(823)])).toEqual([445, 823]);
  });

  it('returns an empty array when nothing is identified', () => {
    expect(opponentIdsFromEntries([entry(null), entry(null)])).toEqual([]);
  });
});
