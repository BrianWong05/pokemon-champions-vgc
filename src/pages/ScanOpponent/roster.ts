import type { Candidate, SlotResult } from '@/features/scan/types';

/** One editable roster slot, decoupled from the raw scan so it can be re-picked. */
export interface ScanEntry {
  id: number | null;
  candidates: Candidate[];
}

type CandidateSlot = Pick<SlotResult, 'candidates'>;

export function assignUniqueCandidates(slots: CandidateSlot[]): ScanEntry[] {
  const current = Array<number | null>(slots.length).fill(null);
  let best = [...current];
  let bestCount = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  const used = new Set<number>();

  const visit = (index: number, count: number, score: number): void => {
    if (index === slots.length) {
      if (count > bestCount || (count === bestCount && score > bestScore)) {
        best = [...current];
        bestCount = count;
        bestScore = score;
      }
      return;
    }

    for (const candidate of slots[index].candidates) {
      if (used.has(candidate.id)) continue;
      used.add(candidate.id);
      current[index] = candidate.id;
      visit(index + 1, count + 1, score + candidate.score);
      used.delete(candidate.id);
    }

    current[index] = null;
    visit(index + 1, count, score);
  };

  visit(0, 0, 0);
  return slots.map((slot, index) => ({ id: best[index], candidates: slot.candidates }));
}

export function unavailableIdsFor(entries: ScanEntry[], currentIndex: number): Set<number> {
  return new Set(
    entries
      .filter((_, index) => index !== currentIndex)
      .map((entry) => entry.id)
      .filter((id): id is number => id != null),
  );
}

export function availableCandidatesFor(entries: ScanEntry[], currentIndex: number): Candidate[] {
  const unavailable = unavailableIdsFor(entries, currentIndex);
  return (entries[currentIndex]?.candidates ?? []).filter((candidate) => !unavailable.has(candidate.id));
}

export function updateEntryId(entries: ScanEntry[], index: number, id: number | null): ScanEntry[] {
  if (id != null && unavailableIdsFor(entries, index).has(id)) return entries;
  return entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, id } : entry));
}

/** The opponent species ids to persist: unique, non-null. */
export function opponentIdsFromEntries(entries: ScanEntry[]): number[] {
  return [...new Set(entries.map((entry) => entry.id).filter((id): id is number => id != null))];
}
