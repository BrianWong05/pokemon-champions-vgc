# Opponent Scan Unique Species Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure automatic and manual opponent Team Preview selections never assign the same Pokémon ID to more than one slot.

**Architecture:** Put the uniqueness policy in a small pure roster module, including a bounded global assignment search over the six slots. Keep the page responsible only for composing those helpers, and extend the shared image picker with an optional disabled-ID set so its other callers remain unchanged.

**Tech Stack:** TypeScript 6, React 19, Vitest 4, Testing Library, Vite 8

## Global Constraints

- The invariant compares exact database Pokémon IDs; forms with distinct IDs remain distinct.
- Initial assignment maximizes the number of filled slots, then total candidate score, without repeated IDs.
- A selection owned by another slot is unavailable in predictions and disabled in the Pokédex picker.
- The recognition model, candidate scores, crop detection, and saved-roster format do not change.
- Existing save-time deduplication remains as defense-in-depth.

---

## File structure

- Create `src/pages/ScanOpponent/roster.ts`: pure opponent roster types, global assignment, availability, guarded updates, and persistence projection.
- Modify `src/pages/ScanOpponent/scan-opponent.test.ts`: unit coverage for all roster invariants.
- Modify `src/features/scan/PokemonImagePicker.tsx`: backward-compatible `disabledIds` prop and disabled styling/behavior.
- Create `src/features/scan/PokemonImagePicker.test.tsx`: component coverage for disabled and enabled choices.
- Modify `src/pages/ScanOpponent/index.tsx`: compose the tested helpers into initial scan seeding and manual correction.

### Task 1: Pure unique-roster policy

**Files:**
- Create: `src/pages/ScanOpponent/roster.ts`
- Modify: `src/pages/ScanOpponent/scan-opponent.test.ts`

**Interfaces:**
- Consumes: `Candidate` and the `candidates` field of `SlotResult` from `@/features/scan/types`.
- Produces: `ScanEntry`, `assignUniqueCandidates(slots)`, `unavailableIdsFor(entries, currentIndex)`, `availableCandidatesFor(entries, currentIndex)`, `updateEntryId(entries, index, id)`, and `opponentIdsFromEntries(entries)`.

- [ ] **Step 1: Replace the existing helper-only test with failing uniqueness tests**

```ts
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/pages/ScanOpponent/scan-opponent.test.ts`

Expected: FAIL because `./roster` does not exist.

- [ ] **Step 3: Implement the pure roster module**

```ts
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
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/pages/ScanOpponent/scan-opponent.test.ts`

Expected: all roster policy tests PASS.

- [ ] **Step 5: Commit the pure policy**

```bash
git add src/pages/ScanOpponent/roster.ts src/pages/ScanOpponent/scan-opponent.test.ts
git commit -m "feat(scan): assign unique opponent species"
```

### Task 2: Disable reserved IDs in the shared image picker

**Files:**
- Create: `src/features/scan/PokemonImagePicker.test.tsx`
- Modify: `src/features/scan/PokemonImagePicker.tsx`

**Interfaces:**
- Consumes: optional `disabledIds?: ReadonlySet<number>`; omitted by existing player/team scan callers.
- Produces: native disabled buttons for reserved IDs; enabled choices continue to call `onSelect(id)`.

- [ ] **Step 1: Write the failing picker component test**

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import PokemonImagePicker from './PokemonImagePicker';

vi.mock('@/components/atoms/PokemonImage', () => ({
  default: ({ name }: { name: string }) => <span>{name} sprite</span>,
}));

const pokemon = (id: number, nameEn: string): PokemonBaseStats => ({
  id,
  identifier: nameEn.toLowerCase(),
  nameEn,
  nameZh: null,
  type1: 'normal',
  type2: null,
  baseHp: 1,
  baseAttack: 1,
  baseDefense: 1,
  baseSpAtk: 1,
  baseSpDef: 1,
  baseSpeed: 1,
});

describe('PokemonImagePicker disabled IDs', () => {
  it('blocks reserved Pokémon while leaving other choices selectable', () => {
    const onSelect = vi.fn();
    render(
      <PokemonImagePicker
        pokemonList={[pokemon(6, 'Charizard'), pokemon(727, 'Incineroar')]}
        selectedId={null}
        disabledIds={new Set([727])}
        onSelect={onSelect}
      />,
    );

    const incineroar = screen.getByRole('button', { name: /Incineroar/i });
    expect((incineroar as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(incineroar);
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Charizard/i }));
    expect(onSelect).toHaveBeenCalledWith(6);
  });
});
```

- [ ] **Step 2: Run the picker test and verify RED**

Run: `npm test -- src/features/scan/PokemonImagePicker.test.tsx`

Expected: FAIL because `PokemonImagePickerProps` does not accept `disabledIds`.

- [ ] **Step 3: Add the optional disabled-ID behavior**

Update the props and component signature:

```tsx
interface PokemonImagePickerProps {
  pokemonList: PokemonBaseStats[];
  selectedId: number | null;
  disabledIds?: ReadonlySet<number>;
  onSelect: (id: number) => void;
}

const PokemonImagePicker: React.FC<PokemonImagePickerProps> = ({
  pokemonList,
  selectedId,
  disabledIds,
  onSelect,
}) => {
```

Replace the picker button map with:

```tsx
{filtered.map((p) => {
  const disabled = disabledIds?.has(p.id) ?? false;
  return (
    <button
      key={p.id}
      type="button"
      disabled={disabled}
      onClick={() => onSelect(p.id)}
      title={`${p.nameEn}${p.nameZh ? ` · ${p.nameZh}` : ''}${disabled ? ' · Already selected' : ''}`}
      className={`flex flex-col items-center gap-1 rounded-lg p-1.5 ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : selectedId === p.id
            ? 'bg-accent-soft ring-2 ring-accent'
            : 'hover:bg-raise'
      }`}
    >
      <PokemonImage id={p.id} name={p.nameEn} className="w-16 h-16" />
      <span
        className={`w-full text-[11px] leading-tight text-center truncate ${
          selectedId === p.id ? 'text-accent' : 'text-ink-3'
        }`}
      >
        {p.nameEn}
      </span>
    </button>
  );
})}
```

- [ ] **Step 4: Run the picker test and existing scan component tests**

Run: `npm test -- src/features/scan/PokemonImagePicker.test.tsx src/features/scan/PlayerScanModal.test.tsx`

Expected: both test files PASS; existing callers compile without supplying `disabledIds`.

- [ ] **Step 5: Commit picker support**

```bash
git add src/features/scan/PokemonImagePicker.tsx src/features/scan/PokemonImagePicker.test.tsx
git commit -m "feat(scan): disable reserved picker species"
```

### Task 3: Compose uniqueness into the opponent confirmation page

**Files:**
- Modify: `src/pages/ScanOpponent/index.tsx`

**Interfaces:**
- Consumes: all roster helpers from Task 1 and `disabledIds` from Task 2.
- Produces: unique initial scan selections, filtered correction predictions, guarded manual updates, and disabled Pokédex entries.

- [ ] **Step 1: Replace local roster definitions with tested imports**

Remove the local `Candidate` import, `ScanEntry` interface, and `opponentIdsFromEntries` implementation. Add:

```ts
import {
  assignUniqueCandidates,
  availableCandidatesFor,
  opponentIdsFromEntries,
  unavailableIdsFor,
  updateEntryId,
  type ScanEntry,
} from './roster';

export { opponentIdsFromEntries, type ScanEntry } from './roster';
```

- [ ] **Step 2: Seed the roster with a global unique assignment**

Replace the scan-complete effect body after `opp` is calculated with:

```ts
const nextRoster = assignUniqueCandidates(opp);
setRoster(nextRoster);
const flagged = nextRoster.findIndex((entry) => {
  const score = entry.candidates.find((candidate) => candidate.id === entry.id)?.score ?? 0;
  return score < LOW_CONFIDENCE;
});
setSelected(flagged >= 0 ? flagged : 0);
setPickerOpen(false);
```

- [ ] **Step 3: Guard manual updates and derive selected-slot availability**

Replace `setEntryId` and add memoized availability before `confirmAndSave`:

```ts
const setEntryId = (index: number, id: number | null) =>
  setRoster((entries) => updateEntryId(entries, index, id));

const selectedCandidates = useMemo(
  () => availableCandidatesFor(roster, selected),
  [roster, selected],
);
const disabledPickerIds = useMemo(
  () => unavailableIdsFor(roster, selected),
  [roster, selected],
);
```

- [ ] **Step 4: Render only available predictions and disable reserved picker IDs**

In the correction panel, replace both occurrences of `(roster[selected]?.candidates ?? [])` with `selectedCandidates`. Pass the disabled set into the picker:

```tsx
<PokemonImagePicker
  pokemonList={pokemonList}
  selectedId={roster[selected]?.id ?? null}
  disabledIds={disabledPickerIds}
  onSelect={(id) => { setEntryId(selected, id); setPickerOpen(false); }}
/>
```

- [ ] **Step 5: Run focused tests and TypeScript checking**

Run: `npm test -- src/pages/ScanOpponent/scan-opponent.test.ts src/features/scan/PokemonImagePicker.test.tsx`

Expected: all focused tests PASS.

Run: `npm run type-check`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 6: Run the complete regression suite and production build**

Run: `npm test`

Expected: the complete Vitest suite PASS with no failures.

Run: `npm run build`

Expected: TypeScript and Vite production build complete successfully.

- [ ] **Step 7: Commit page integration**

```bash
git add src/pages/ScanOpponent/index.tsx
git commit -m "fix(scan): prevent duplicate opponent predictions"
```
