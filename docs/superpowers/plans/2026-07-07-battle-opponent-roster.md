# Battle Opponent Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Confirm the opponent's six from a team-preview scan into a persistent battle roster; battle scans then mask opponent recognition to those six (+form families) and a calculator strip offers one-tap defender/attacker picks.

**Architecture:** A pure localStorage store + form-family helper (`battleRoster.ts`), a thin page hook (`useBattleRoster.ts`), a floating strip component, two optional props on `ScanTeamModal`, and one pipeline change: `scanFrame`'s `legalIds` accepts a per-(side, mode) resolver. Spec: `docs/superpowers/specs/2026-07-07-battle-opponent-roster-design.md`.

**Tech Stack:** React 18 + TypeScript, Vitest (colocated, node), localStorage, existing scan pipeline. No new dependencies.

## Global Constraints

- **No new npm dependencies.**
- **No-roster behavior identical to today**: a plain `Set` passed as `legalIds` must behave byte-for-byte as now; all existing scan tests and `scripts/scan-mode-accuracy.test.ts` (golden floor) stay green untouched.
- localStorage key is exactly `scan.battleRoster`.
- The Teams-page host of `ScanTeamModal` (`src/pages/Teams/index.tsx`) is NOT modified; both new modal props are optional.
- Form ids: base species are `id < 10000`, alternate/Mega forms are `id >= 10000` with identifiers like `charizard-mega-x`, `rotom-heat`, `mr-mime-galar` (verified in `vgc_pokemon.db`). The `id >= 10000` guard is what makes prefix-matching safe (`porygon-z` is a base id, so it can never be swept into `porygon`'s family).
- The spec's "component tests" cannot be automated: the repo has no component-test infra (no testing-library, and adding one violates no-new-deps). Pure logic is unit-tested; UI is verified by the Task 5 manual checklist. This is the documented resolution of that spec item.
- Run focused tests with `npx vitest run <path>`; full suite `npm test`; types `npx tsc --noEmit`. Commit by exact file path (never `git add -A`).
- Branch: `feat/battle-roster`.

---

### Task 1: Roster store + form-family helper (`battleRoster.ts`)

**Files:**
- Create: `src/features/scan/battleRoster.ts`
- Test: `src/features/scan/battleRoster.test.ts`

**Interfaces:**
- Consumes: `PokemonBaseStats` (`{ id: number; identifier: string; ... }`) from `@/components/molecules/PokemonSearchSelect`.
- Produces: `readBattleRoster(): number[] | null`, `saveBattleRoster(ids: number[]): void`, `clearBattleRoster(): void`, `formFamilyIds(rosterIds: number[], pokemonList: PokemonBaseStats[]): Set<number>` — Tasks 3 and 4 rely on these exact names.

- [ ] **Step 1: Write the failing tests**

First open `src/features/damage-calculator/utils/build-store.test.ts` and copy ITS localStorage setup verbatim (it already solves node-vitest storage). If it has none (jsdom configured globally), omit the stub below. Otherwise use:

```typescript
// src/features/scan/battleRoster.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readBattleRoster, saveBattleRoster, clearBattleRoster, formFamilyIds } from './battleRoster';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
});

const mon = (id: number, identifier: string): PokemonBaseStats =>
  ({ id, identifier, nameEn: identifier, nameZh: null, type1: 'normal', type2: null,
     baseHp: 1, baseAttack: 1, baseDefense: 1, baseSpAtk: 1, baseSpDef: 1, baseSpeed: 1 } as PokemonBaseStats);

const LIST = [
  mon(6, 'charizard'), mon(10034, 'charizard-mega-x'), mon(10035, 'charizard-mega-y'),
  mon(479, 'rotom'), mon(10008, 'rotom-heat'),
  mon(137, 'porygon'), mon(474, 'porygon-z'),
  mon(122, 'mr-mime'), mon(10168, 'mr-mime-galar'),
];

describe('battle roster store', () => {
  beforeEach(() => store.clear());

  it('round-trips a roster and clears it', () => {
    saveBattleRoster([6, 479]);
    expect(readBattleRoster()).toEqual([6, 479]);
    clearBattleRoster();
    expect(readBattleRoster()).toBeNull();
  });

  it('rejects empty saves and treats corrupt values as no roster', () => {
    saveBattleRoster([]);
    expect(readBattleRoster()).toBeNull();
    store.set('scan.battleRoster', '{not json');
    expect(readBattleRoster()).toBeNull();
    store.set('scan.battleRoster', '["a","b"]');
    expect(readBattleRoster()).toBeNull();
  });
});

describe('formFamilyIds', () => {
  it('expands a base species to its full form family', () => {
    expect([...formFamilyIds([6], LIST)].sort((a, b) => a - b)).toEqual([6, 10034, 10035]);
  });

  it('a form id resolves back to its base and expands the family', () => {
    expect([...formFamilyIds([10008], LIST)].sort((a, b) => a - b)).toEqual([479, 10008]);
  });

  it('hyphenated base identifiers expand correctly (mr-mime trap)', () => {
    expect([...formFamilyIds([122], LIST)].sort((a, b) => a - b)).toEqual([122, 10168]);
  });

  it('never sweeps a different base species in via prefix (porygon vs porygon-z)', () => {
    expect(formFamilyIds([137], LIST).has(474)).toBe(false);
  });

  it('unknown ids pass through unexpanded', () => {
    expect([...formFamilyIds([9999], LIST)]).toEqual([9999]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/scan/battleRoster.test.ts`
Expected: FAIL — cannot resolve `./battleRoster`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/features/scan/battleRoster.ts
// Battle-session opponent roster: the 1-6 species ids the user confirmed
// from a team-preview scan, persisted until cleared or replaced. Species
// only — no HP memory (spec decision).
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const KEY = 'scan.battleRoster';

export function readBattleRoster(): number[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((n) => typeof n === 'number')) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed as number[];
  } catch {
    try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
    return null;
  }
}

export function saveBattleRoster(ids: number[]): void {
  if (ids.length === 0) return;
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
}

export function clearBattleRoster(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

// The opponent can Mega Evolve / form-change mid-battle, so the scan mask is
// the union of each confirmed species' form family. Forms are id >= 10000
// with identifiers prefixed by the base's (charizard -> charizard-mega-x);
// the id-range guard prevents cross-species prefix collisions (porygon-z is
// a BASE id, so it never joins porygon's family).
export function formFamilyIds(rosterIds: number[], pokemonList: PokemonBaseStats[]): Set<number> {
  const byId = new Map(pokemonList.map((p) => [p.id, p]));
  const bases = pokemonList.filter((p) => p.id < 10000);
  const out = new Set<number>();
  for (const id of rosterIds) {
    const mon = byId.get(id);
    if (!mon) { out.add(id); continue; }
    let base = mon;
    if (mon.id >= 10000) {
      // Longest-prefix base: a form's identifier starts with its base's.
      let best: PokemonBaseStats | null = null;
      for (const b of bases) {
        if (mon.identifier.startsWith(b.identifier + '-') && (!best || b.identifier.length > best.identifier.length)) best = b;
      }
      if (best) base = best;
      out.add(mon.id);
    }
    out.add(base.id);
    for (const p of pokemonList) {
      if (p.id >= 10000 && p.identifier.startsWith(base.identifier + '-')) out.add(p.id);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/scan/battleRoster.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/battleRoster.ts src/features/scan/battleRoster.test.ts
git commit -m "feat: battle roster store + form-family mask helper"
```

---

### Task 2: Per-side masks in `scanFrame`

**Files:**
- Modify: `src/features/scan/scanFrame.ts` (signature + mask resolution; lines 46–95)
- Modify: `src/features/scan/useTeamScan.ts:10,20` (widen the parameter type, pass-through)
- Test: `src/features/scan/scanFrame.test.ts` (add one describe block; follow the file's existing stub-deps pattern)

**Interfaces:**
- Consumes: nothing new.
- Produces: `export type LegalIdsBySide = Set<number> | ((side: ScanSide | undefined, mode: ScanMode | null) => Set<number>)` from `scanFrame.ts`; `scanFrame(image, legalIds: LegalIdsBySide, deps?)` and `ingestFrame(frame, legalIds: LegalIdsBySide, deps?)`; `useTeamScan(legalIds: LegalIdsBySide, deps?)`. Task 3 passes a resolver from the modal.

The resolver receives the MODE because team-preview scans must never be roster-masked (they are what creates the roster) — only `mode === 'battle'` opponent tiles narrow.

- [ ] **Step 1: Write the failing test**

Open `src/features/scan/scanFrame.test.ts` first and reuse its existing stub helpers/localStorage setup (it already stubs `detectScanTargets` returning battle targets). Append, adapting stub construction to the file's local idiom:

```typescript
describe('per-side legalIds resolver', () => {
  it('battle: opponent tiles classify under the roster set, player tiles under the full set', async () => {
    const seen: number[][] = [];
    const deps = {
      loadRefs: async () => [],
      blobToRgbaImage: async () => img,           // reuse the file's tiny RgbaImage fixture
      scanTeamImage: () => [],
      detectScanTargets: () => ({
        mode: 'battle' as const,
        gameRect: null,
        targets: [
          { box: { x: 0, y: 0, w: 2, h: 2 }, side: 'opponent' as const, hpPercent: null },
          { box: { x: 0, y: 0, w: 2, h: 2 }, side: 'player' as const, hpPercent: null },
        ],
      }),
      cropImage: (i: RgbaImage) => i,
      matchTile: () => [],
      loadClassifier: async () => ({
        classes: [],
        classify: async (_t: RgbaImage, ids: Set<number>) => {
          seen.push([...ids].sort((a, b) => a - b));
          return [{ id: 6, score: 0.9 }];
        },
      }),
    };
    const resolver = (side: ScanSide | undefined, mode: ScanMode | null) =>
      mode === 'battle' && side !== 'player' ? new Set([6, 10034]) : new Set([1, 2, 3]);
    await scanFrame(img, resolver, deps);
    expect(seen).toEqual([[6, 10034], [1, 2, 3]]);
  });

  it('a plain Set behaves exactly as before (adapter default)', async () => {
    // reuse an existing plain-Set test's deps; assert classify receives that same Set for every tile
  });
});
```

For the second test: copy the deps of the FIRST test, pass `new Set([7, 8])` instead of the resolver, and assert `seen` equals `[[7, 8], [7, 8]]` — write it out fully in the file (no comment-only test bodies).

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run src/features/scan/scanFrame.test.ts`
Expected: new tests FAIL (type error / resolver treated as Set); existing tests PASS.

- [ ] **Step 3: Implement**

In `src/features/scan/scanFrame.ts` — add the type and resolution; replace the two `legalIds` uses:

```typescript
import type { Candidate, ReferenceEntry, RgbaImage, ScanSide, SlotResult, TileBox } from './types';
```

```typescript
export type LegalIdsBySide =
  | Set<number>
  | ((side: ScanSide | undefined, mode: ScanMode | null) => Set<number>);
```

```typescript
export async function scanFrame(
  image: RgbaImage,
  legalIds: LegalIdsBySide,
  deps: TeamScanDeps = DEFAULT_DEPS,
): Promise<ScanFrameResult> {
  const engine = getEngineSetting();
  const resolve = (side: ScanSide | undefined, mode: ScanMode | null): Set<number> =>
    typeof legalIds === 'function' ? legalIds(side, mode) : legalIds;
  const allRefs = await deps.loadRefs();
  // Descriptor references are filtered per resolved mask; the cache keeps the
  // plain-Set path to a single filter pass, exactly as before.
  const refsCache = new Map<Set<number>, ReferenceEntry[]>();
  const refsFor = (set: Set<number>): ReferenceEntry[] => {
    let r = refsCache.get(set);
    if (!r) { r = filterByFormatLegal(allRefs, set); refsCache.set(set, r); }
    return r;
  };

  const hasTargetPipelineDeps =
    deps.detectScanTargets != null ||
    deps.cropImage != null ||
    deps.matchTile != null ||
    deps.loadClassifier != null;

  if (engine === 'descriptor' || (engine !== 'classifier' && !hasTargetPipelineDeps)) {
    console.log('[scan] engine: descriptor');
    return { mode: null, slots: deps.scanTeamImage(image, refsFor(resolve(undefined, null)), 3) };
  }

  const detectTargets = deps.detectScanTargets ?? DEFAULT_DEPS.detectScanTargets;
  const crop = deps.cropImage ?? DEFAULT_DEPS.cropImage;
  const matchTileFn = deps.matchTile ?? DEFAULT_DEPS.matchTile;
  const loadClassifierFn = deps.loadClassifier ?? DEFAULT_DEPS.loadClassifier;

  const classifier = await loadClassifierFn();
  const { mode, targets } = detectTargets(image);
  const slots: SlotResult[] = [];
  for (const { box, side, hpPercent } of targets) {
    const tile = crop(image, box);
    const mask = resolve(side, mode);
    const classifierCandidates = classifier ? await classifier.classify(tile, mask, 3) : [];
    const useDescriptorFallback =
      engine === 'auto' && (!classifier || (classifierCandidates[0]?.score ?? 0) < CLASSIFIER_CONFIDENCE_THRESHOLD);
    const candidates = useDescriptorFallback ? matchTileFn(tile, refsFor(mask), 3) : classifierCandidates;
    slots.push({ box, side, hpPercent, candidates });
  }
  console.log(`[scan] mode: ${mode}, engine: ${classifier ? 'classifier' : 'descriptor'} (${engine})`);
  return { mode, slots };
}
```

(The old line-52 eager `const refs = filterByFormatLegal(await deps.loadRefs(), legalIds);` is deleted — `refsFor` replaces both it and the loop's `refs` use.) `ingestFrame`: change its `legalIds: Set<number>` to `LegalIdsBySide` and pass through unchanged.

In `src/features/scan/useTeamScan.ts`: change the import to include the type and widen the parameter — `export function useTeamScan(legalIds: LegalIdsBySide, deps: TeamScanDeps = DEFAULT_DEPS)` (add `import { ..., type LegalIdsBySide } from './scanFrame';`). No other change.

- [ ] **Step 4: Run scan tests + full suite**

Run: `npx vitest run src/features/scan/scanFrame.test.ts src/features/scan/useTeamScan.test.ts`
Expected: ALL PASS.
Run: `npm test` — Expected: all pass (golden floor included; the plain-Set path is unchanged). Then `npx tsc --noEmit` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/scanFrame.ts src/features/scan/useTeamScan.ts src/features/scan/scanFrame.test.ts
git commit -m "feat: per-(side,mode) legalIds resolver in scanFrame"
```

---

### Task 3: `ScanTeamModal` — roster mask + opponent-only preview + Confirm

**Files:**
- Modify: `src/features/scan/ScanTeamModal.tsx` (props :14-27, legalIds :37-39, roster render :193, actions :314-351)

**Interfaces:**
- Consumes: `formFamilyIds` (Task 1), `LegalIdsBySide` (Task 2).
- Produces: two new optional props — `battleRoster?: number[] | null`, `onConfirmRoster?: (ids: number[]) => void` — Task 4 passes both from the calc page.

No automated test (component; see Global Constraints) — correctness is pinned by `tsc`, the unchanged Teams-page host, and Task 5's checklist.

- [ ] **Step 1: Add props and sided legalIds**

Extend the props interface (after `externalBlob`):

```typescript
  /** Battle-roster mode: confirmed opponent ids — battle scans mask opponent tiles to their form families. */
  battleRoster?: number[] | null;
  /** Battle-roster mode: when set, team-preview results hide player rows and confirm saves the roster. */
  onConfirmRoster?: (ids: number[]) => void;
```

Destructure both in the component signature. Replace the `legalIds` memo (line 37) with:

```typescript
  const fullLegalIds = useMemo(() => new Set(pokemonList.map((p) => p.id)), [pokemonList]);
  const maskIds = useMemo(
    () => (battleRoster && battleRoster.length > 0 ? formFamilyIds(battleRoster, pokemonList) : null),
    [battleRoster, pokemonList],
  );
  // Team-preview scans are never roster-masked (they CREATE the roster);
  // player-side tiles keep the full format mask (your own mons are not on
  // the opponent's roster).
  const legalIds = useMemo<LegalIdsBySide>(
    () => (maskIds
      ? (side, scanMode) => (scanMode === 'battle' && side !== 'player' ? maskIds : fullLegalIds)
      : fullLegalIds),
    [maskIds, fullLegalIds],
  );
```

Imports: `import { formFamilyIds } from './battleRoster';` and add `type LegalIdsBySide` to the `./useTeamScan` import (re-exported there) or import from `./scanFrame`.

- [ ] **Step 2: Hide player rows in roster-confirm preview mode**

`pickerOpenFor`/`setEntryId`/`removeEntry` are keyed by ORIGINAL roster index — preserve it. Replace the `roster.map((entry, i) => {` opener (line 193) with:

```typescript
            {roster
              .map((entry, i) => ({ entry, i }))
              .filter(({ entry }) => !(onConfirmRoster && mode !== 'battle' && entry.side === 'player'))
              .map(({ entry, i }) => {
```

(The body keeps using `entry` and `i` unchanged; only the closing `})}` gains no change.) Also apply the same condition to the too-few-warning row count — line 184 already counts non-player slots, so it needs no change.

- [ ] **Step 3: Add the Confirm opponent team action**

Add next to `confirm`/`saveTeam` (after line 123):

```typescript
  const confirmRosterIds = () =>
    roster.filter((e) => e.side !== 'player' && e.id != null).map((e) => e.id as number);

  const confirmRoster = () => {
    const ids = confirmRosterIds();
    if (ids.length === 0 || !onConfirmRoster) return;
    onConfirmRoster(ids);
    handleClose();
  };
```

In the footer button row (after the `onSaveTeam` button block, line 333-341), add — only for team-preview results in roster mode:

```typescript
              {onConfirmRoster && mode !== 'battle' && (
                <button
                  className="px-4 py-2 rounded bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-45"
                  onClick={confirmRoster}
                  disabled={confirmRosterIds().length === 0}
                >
                  Confirm opponent team
                </button>
              )}
```

(The calc host passes no `onImport`, so "Create team" never renders there; "Save opp team to Teams" remains the secondary action. The Teams host passes no `onConfirmRoster`, so nothing changes for it.)

- [ ] **Step 4: Verify types and existing tests**

Run: `npx tsc --noEmit` — Expected: clean.
Run: `npm test` — Expected: all pass (no test exercises the modal; this catches accidental pipeline breakage).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/ScanTeamModal.tsx
git commit -m "feat: modal roster mask + opponent-only preview + confirm action"
```

---

### Task 4: Calc page wiring — hook + strip

**Files:**
- Create: `src/features/scan/useBattleRoster.ts`
- Create: `src/features/scan/OpponentRosterStrip.tsx`
- Modify: `src/pages/DamageCalculator/index.tsx` (state near :51, both render branches :265-294 and :296-364)

**Interfaces:**
- Consumes: `readBattleRoster`/`saveBattleRoster`/`clearBattleRoster` (Task 1); modal props (Task 3); the page's existing `handleLoadDefender`/`handleLoadAttacker` (`index.tsx:105-123`).
- Produces: `useBattleRoster(): { roster: number[] | null; confirmRoster: (ids: number[]) => void; clearRoster: () => void }`.

- [ ] **Step 1: Write the hook**

```typescript
// src/features/scan/useBattleRoster.ts
import { useCallback, useState } from 'react';
import { clearBattleRoster, readBattleRoster, saveBattleRoster } from './battleRoster';

export function useBattleRoster() {
  const [roster, setRoster] = useState<number[] | null>(() => readBattleRoster());
  const confirmRoster = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    saveBattleRoster(ids);
    setRoster(ids);
  }, []);
  const clearRoster = useCallback(() => {
    clearBattleRoster();
    setRoster(null);
  }, []);
  return { roster, confirmRoster, clearRoster };
}
```

- [ ] **Step 2: Write the strip component**

```tsx
// src/features/scan/OpponentRosterStrip.tsx
// Floating battle-roster strip on the calculator: the opponent's confirmed
// six, one tap -> defender/attacker actions, ✕ ends the battle session.
import React, { useState } from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface OpponentRosterStripProps {
  roster: number[];
  byId: Map<number, PokemonBaseStats>;
  onSetDefender: (id: number) => void;
  onSetAttacker: (id: number) => void;
  onClear: () => void;
}

const OpponentRosterStrip: React.FC<OpponentRosterStripProps> = ({ roster, byId, onSetDefender, onSetAttacker, onClear }) => {
  const [activeId, setActiveId] = useState<number | null>(null);
  return (
    <div className="fixed bottom-20 right-3 z-40 md:bottom-6 rounded-xl border border-line-2 bg-card p-2 shadow-lg">
      <div className="flex items-center gap-1">
        <span className="px-1 text-[10px] font-semibold text-danger">Opp</span>
        {roster.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveId(activeId === id ? null : id)}
            className={`rounded-lg border p-0.5 ${activeId === id ? 'border-transparent bg-accent-soft ring-2 ring-accent' : 'border-line bg-inset'}`}
            title={byId.get(id)?.nameEn}
          >
            <PokemonImage id={id} name={byId.get(id)?.nameEn ?? 'pokemon'} className="w-9 h-9" />
          </button>
        ))}
        <button
          type="button"
          className="ml-1 px-1.5 py-0.5 text-danger hover:bg-danger-soft rounded"
          onClick={onClear}
          aria-label="End battle (clear opponent roster)"
          title="End battle"
        >
          ✕
        </button>
      </div>
      {activeId != null && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-ink-2 truncate">{byId.get(activeId)?.nameEn}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-2 py-1 text-xs font-semibold text-accent border border-accent-soft-line rounded hover:bg-accent-soft"
              onClick={() => { onSetDefender(activeId); setActiveId(null); }}
            >
              Set as defender
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs font-semibold text-safe border border-safe-line rounded hover:bg-safe-soft"
              onClick={() => { onSetAttacker(activeId); setActiveId(null); }}
            >
              Set as attacker
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpponentRosterStrip;
```

- [ ] **Step 3: Wire the calculator page**

In `src/pages/DamageCalculator/index.tsx`:

Imports:
```typescript
import { useBattleRoster } from '@/features/scan/useBattleRoster';
import OpponentRosterStrip from '@/features/scan/OpponentRosterStrip';
```

State (near the other hooks, after line 57):
```typescript
  const { roster: battleRoster, confirmRoster, clearRoster } = useBattleRoster();
  const pokemonById = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);
```
(Add `useMemo` to the React import if absent.)

Add to BOTH `ScanTeamModal` renders (mobile :282-290 and desktop :353-361), alongside the existing props:
```tsx
          battleRoster={battleRoster}
          onConfirmRoster={confirmRoster}
```

Render the strip in BOTH branches (immediately before each `<ToastNotification ... />`):
```tsx
        {battleRoster && battleRoster.length > 0 && (
          <OpponentRosterStrip
            roster={battleRoster}
            byId={pokemonById}
            onSetDefender={(id) => void handleLoadDefender(id)}
            onSetAttacker={(id) => void handleLoadAttacker(id)}
            onClear={clearRoster}
          />
        )}
```
(No `hpPercent` passed — spec: strip loads at 100%, no HP memory.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — clean. Run: `npm test` — all pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/useBattleRoster.ts src/features/scan/OpponentRosterStrip.tsx src/pages/DamageCalculator/index.tsx
git commit -m "feat: battle roster hook + opponent strip on the calculator"
```

---

### Task 5: Verification (suite + manual flow)

**Files:** none — verification only.

- [ ] **Step 1: Full suite + types**

Run: `npm test` (expect ~278+, all passing incl. the scan-mode golden floor) and `npx tsc --noEmit` (clean).

- [ ] **Step 2: Manual flow checklist (dev server)**

Start: `npm run dev`, open the Calculator page. Use `training/screenshots/Xnip2026-07-01_03-24-56.png` (or any team-preview screenshot) and a 1v1 battle frame like `training/screenshots/Xnip2026-07-07_00-10-00.jpg`.

1. Scan opponent → team-preview screenshot → results show ONLY Opp rows (no "You" badges) → "Confirm opponent team" enabled → click. Modal closes; the floating strip appears with the confirmed sprites.
2. Reload the page → strip persists (localStorage).
3. Tap a strip sprite → action row appears → "Set as defender" loads it into the calc at 100% HP.
4. Scan opponent → battle frame → console shows `[scan] mode: battle` → opponent row candidates come ONLY from the confirmed roster's families; the You row candidates are unrestricted; "Choose another Pokémon" still offers the full list on every row.
5. Scan opponent → team-preview again → confirm → roster REPLACES (strip updates).
6. ✕ on the strip → strip disappears; a subsequent battle scan behaves exactly as before the feature (unmasked).
Record any deviation as a bug — do not ship with a failing checklist item.

- [ ] **Step 3: Hand off**

`git status --short` must be clean. Use superpowers:finishing-a-development-branch for merge/PR.
