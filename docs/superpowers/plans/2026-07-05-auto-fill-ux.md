# Auto-fill-then-confirm UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A scanned Pokémon loads with a clean build; the user can one-tap apply a common spread (Max HB / Max HD) and the calc remembers the per-species build and re-applies it on the next scan.

**Architecture:** Two pure utils (`common-spreads` data, `build-store` over localStorage), three new pure reducer actions (`APPLY_SPREAD`, `APPLY_SAVED_BUILD`, `RESET_BUILD`) plus a `loadedFromScan` flag on `SideState` (set via `SET_SCAN_LOADED`), a small `BuildPresets` control in `PokemonPanel`, and wiring in `DamageCalculator` (scan-load looks up a saved build; a per-side effect persists edits of scan-loaded sides). Confidence colors / species-specific auto-apply / moves are out of scope.

**Tech Stack:** TypeScript, React (useReducer), Vitest (+ jsdom for the effect/localStorage).

## Global Constraints

- **The four build fields can't be read by the scan** — this slice only makes them fast to set + sticky. No confidence colors in v1.
- **Fields in scope:** `nature` (+ derived `boostedStat`/`hinderedStat`), `activeAbility`, `item`, the six `sp*`. **Moves out.**
- **Species key = `PokemonBaseStats.nameEn`** (the same name `POKEMON_PRESETS.pokemonName` and `handleSelectPreset` use).
- **Natures are full strings** (e.g. `"Bold (+DEF, -ATK)"` from `NATURES`); `getNatureStats(nature)` derives boosted/hindered.
- **Reducer stays pure** — no `localStorage` in `useCalculatorState.ts`; persistence lives in `DamageCalculator`.
- **Existing 193 tests must stay green.** Manual (non-scan) species selection and live damage results unchanged.
- Build/verify: `npx vitest run <files>` per task; `npx tsc --noEmit` and full `npx vitest run` at the end.

---

## File Structure

- **Create** `src/features/damage-calculator/utils/common-spreads.ts` — `Spread` type + `COMMON_SPREADS` (Max HB, Max HD).
- **Create** `src/features/damage-calculator/utils/build-store.ts` — `SavedBuild` type + `loadSavedBuild`/`saveBuild`/`clearBuild` over localStorage.
- **Modify** `src/features/damage-calculator/hooks/useCalculatorState.ts` — `loadedFromScan` on `SideState`/`initialSide`; actions `APPLY_SPREAD`, `APPLY_SAVED_BUILD`, `SET_SCAN_LOADED`, `RESET_BUILD`.
- **Create** `src/features/damage-calculator/components/BuildPresets.tsx` — the Max HB / Max HD / reset buttons.
- **Modify** `src/components/organisms/PokemonPanel.tsx` — render `BuildPresets` (new props).
- **Modify** `src/features/damage-calculator/components/DefenderPanel.tsx` + `AttackerPanel.tsx` — pass the new props through.
- **Modify** `src/pages/DamageCalculator/index.tsx` — scan-load saved-build lookup + `SET_SCAN_LOADED`; per-side save effect; reset handler.

---

## Task 1: `common-spreads.ts` — the two presets

**Files:**
- Create: `src/features/damage-calculator/utils/common-spreads.ts`
- Test: `src/features/damage-calculator/utils/common-spreads.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface Spread { id: 'maxHB' | 'maxHD'; label: string; sp: { hp:number; atk:number; def:number; spa:number; spd:number; spe:number }; nature: string }
  const COMMON_SPREADS: Spread[]
  ```

- [ ] **Step 1: Write the failing test**

Create `src/features/damage-calculator/utils/common-spreads.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { COMMON_SPREADS } from './common-spreads';

describe('COMMON_SPREADS', () => {
  it('has Max HB and Max HD', () => {
    expect(COMMON_SPREADS.map((s) => s.id)).toEqual(['maxHB', 'maxHD']);
  });
  it('Max HB is 32 HP / 32 Def with a +Def nature', () => {
    const hb = COMMON_SPREADS.find((s) => s.id === 'maxHB')!;
    expect(hb.sp).toEqual({ hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 });
    expect(hb.nature).toBe('Bold (+DEF, -ATK)');
  });
  it('Max HD is 32 HP / 32 SpD with a +SpD nature', () => {
    const hd = COMMON_SPREADS.find((s) => s.id === 'maxHD')!;
    expect(hd.sp).toEqual({ hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 });
    expect(hd.nature).toBe('Calm (+SPD, -ATK)');
  });
  it('no spread exceeds the 32-per-stat cap or 66 total', () => {
    for (const s of COMMON_SPREADS) {
      const vals = Object.values(s.sp);
      expect(Math.max(...vals)).toBeLessThanOrEqual(32);
      expect(vals.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(66);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/utils/common-spreads.test.ts`
Expected: FAIL — cannot resolve `./common-spreads`.

- [ ] **Step 3: Write the implementation**

Create `src/features/damage-calculator/utils/common-spreads.ts`:
```ts
export interface Spread {
  id: 'maxHB' | 'maxHD';
  label: string;
  sp: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  nature: string;
}

// Generic bulk spreads (Champions SP: 66 total, cap 32/stat). Nature strings match NATURES.
export const COMMON_SPREADS: Spread[] = [
  { id: 'maxHB', label: 'Max HB', sp: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }, nature: 'Bold (+DEF, -ATK)' },
  { id: 'maxHD', label: 'Max HD', sp: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 }, nature: 'Calm (+SPD, -ATK)' },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/utils/common-spreads.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/utils/common-spreads.ts src/features/damage-calculator/utils/common-spreads.test.ts
git commit -m "feat(calc): common SP spreads (Max HB / Max HD)"
```

---

## Task 2: `build-store.ts` — per-species saved builds

**Files:**
- Create: `src/features/damage-calculator/utils/build-store.ts`
- Test: `src/features/damage-calculator/utils/build-store.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface SavedBuild { nature: string; ability: string | null; item: string | null; sp: { hp:number; atk:number; def:number; spa:number; spd:number; spe:number } }
  function loadSavedBuild(species: string): SavedBuild | null
  function saveBuild(species: string, build: SavedBuild): void
  function clearBuild(species: string): void
  ```

- [ ] **Step 1: Write the failing test**

Create `src/features/damage-calculator/utils/build-store.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadSavedBuild, saveBuild, clearBuild, type SavedBuild } from './build-store';

const build: SavedBuild = {
  nature: 'Bold (+DEF, -ATK)', ability: 'Intimidate', item: 'Sitrus Berry',
  sp: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 },
};

describe('build-store', () => {
  beforeEach(() => localStorage.clear());

  it('returns null for an unknown species', () => {
    expect(loadSavedBuild('Garchomp')).toBeNull();
  });
  it('round-trips a saved build by species', () => {
    saveBuild('Garchomp', build);
    expect(loadSavedBuild('Garchomp')).toEqual(build);
    expect(loadSavedBuild('Incineroar')).toBeNull();
  });
  it('clears a species without touching others', () => {
    saveBuild('Garchomp', build);
    saveBuild('Incineroar', build);
    clearBuild('Garchomp');
    expect(loadSavedBuild('Garchomp')).toBeNull();
    expect(loadSavedBuild('Incineroar')).toEqual(build);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/utils/build-store.test.ts`
Expected: FAIL — cannot resolve `./build-store`.

- [ ] **Step 3: Write the implementation**

Create `src/features/damage-calculator/utils/build-store.ts`:
```ts
export interface SavedBuild {
  nature: string;
  ability: string | null;
  item: string | null;
  sp: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
}

const KEY = 'champvgc.savedBuilds';

function readAll(): Record<string, SavedBuild> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, SavedBuild>) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, SavedBuild>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable (private mode / SSR) — silently skip */
  }
}

export function loadSavedBuild(species: string): SavedBuild | null {
  return readAll()[species] ?? null;
}

export function saveBuild(species: string, build: SavedBuild): void {
  const all = readAll();
  all[species] = build;
  writeAll(all);
}

export function clearBuild(species: string): void {
  const all = readAll();
  delete all[species];
  writeAll(all);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/utils/build-store.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/utils/build-store.ts src/features/damage-calculator/utils/build-store.test.ts
git commit -m "feat(calc): per-species saved-build store (localStorage)"
```

---

## Task 3: reducer — `loadedFromScan` + `APPLY_SPREAD` / `APPLY_SAVED_BUILD` / `SET_SCAN_LOADED` / `RESET_BUILD`

**Files:**
- Modify: `src/features/damage-calculator/hooks/useCalculatorState.ts`
- Test: `src/features/damage-calculator/hooks/useCalculatorState.buildux.test.ts`

**Interfaces:**
- Consumes: `Spread` (Task 1), `SavedBuild` (Task 2), `getNatureStats` (existing).
- Produces (new `SideAction` members + `SideState.loadedFromScan: boolean`):
  ```ts
  { type: 'APPLY_SPREAD', payload: { side: 'p1'|'p2', sp: Spread['sp'], nature: string } }
  { type: 'APPLY_SAVED_BUILD', payload: { side: 'p1'|'p2', build: SavedBuild } }
  { type: 'SET_SCAN_LOADED', payload: { side: 'p1'|'p2', val: boolean } }
  { type: 'RESET_BUILD', payload: { side: 'p1'|'p2' } }
  ```

- [ ] **Step 1: Write the failing test**

Create `src/features/damage-calculator/hooks/useCalculatorState.buildux.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sideReducer, initialSide } from './useCalculatorState';
import type { SavedBuild } from '../utils/build-store';

describe('build-ux reducer actions', () => {
  it('APPLY_SPREAD sets SP + nature (+ derived stats), leaves ability/item', () => {
    const start = { ...initialSide, activeAbility: 'Intimidate', item: 'Leftovers' };
    const next = sideReducer(start, {
      type: 'APPLY_SPREAD',
      payload: { side: 'p2', sp: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }, nature: 'Bold (+DEF, -ATK)' },
    });
    expect(next.spHp).toBe(32);
    expect(next.spDef).toBe(32);
    expect(next.nature).toBe('Bold (+DEF, -ATK)');
    expect(next.boostedStat).toBe('def');
    expect(next.hinderedStat).toBe('atk');
    expect(next.activeAbility).toBe('Intimidate'); // untouched
    expect(next.item).toBe('Leftovers'); // untouched
  });

  it('APPLY_SAVED_BUILD sets SP + nature + ability + item', () => {
    const build: SavedBuild = {
      nature: 'Calm (+SPD, -ATK)', ability: 'Rough Skin', item: 'Sitrus Berry',
      sp: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 },
    };
    const next = sideReducer(initialSide, { type: 'APPLY_SAVED_BUILD', payload: { side: 'p2', build } });
    expect(next.spSpd).toBe(32);
    expect(next.nature).toBe('Calm (+SPD, -ATK)');
    expect(next.boostedStat).toBe('spd');
    expect(next.activeAbility).toBe('Rough Skin');
    expect(next.item).toBe('Sitrus Berry');
  });

  it('SET_SCAN_LOADED toggles the flag', () => {
    const next = sideReducer(initialSide, { type: 'SET_SCAN_LOADED', payload: { side: 'p2', val: true } });
    expect(next.loadedFromScan).toBe(true);
  });

  it('RESET_BUILD clears SP/nature/item and the flag', () => {
    const dirty = { ...initialSide, spHp: 32, spDef: 32, nature: 'Bold (+DEF, -ATK)', item: 'Leftovers', loadedFromScan: true };
    const next = sideReducer(dirty, { type: 'RESET_BUILD', payload: { side: 'p2' } });
    expect(next.spHp).toBe(0);
    expect(next.spDef).toBe(0);
    expect(next.nature).toBe('Hardy');
    expect(next.item).toBeNull();
    expect(next.loadedFromScan).toBe(false);
  });

  it('initialSide.loadedFromScan defaults false', () => {
    expect(initialSide.loadedFromScan).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/hooks/useCalculatorState.buildux.test.ts`
Expected: FAIL — `loadedFromScan` missing / action types unknown.

- [ ] **Step 3: Add `loadedFromScan` to the type + `initialSide`**

In `src/features/damage-calculator/hooks/useCalculatorState.ts`, in `interface SideState` add after `faintedCount: number;`:
```ts
  loadedFromScan: boolean;
```
In `initialSide`, add after `faintedCount: 0,`:
```ts
  loadedFromScan: false,
```

- [ ] **Step 4: Add the four action types to the `SideAction` union**

Add these members alongside the existing `SideAction` union entries (e.g. after the `APPLY_PRESET` line):
```ts
  | { type: 'APPLY_SPREAD', payload: { side: 'p1' | 'p2', sp: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }, nature: string } }
  | { type: 'APPLY_SAVED_BUILD', payload: { side: 'p1' | 'p2', build: import('../utils/build-store').SavedBuild } }
  | { type: 'SET_SCAN_LOADED', payload: { side: 'p1' | 'p2', val: boolean } }
  | { type: 'RESET_BUILD', payload: { side: 'p1' | 'p2' } }
```

- [ ] **Step 5: Add the four cases to `sideReducer`**

In `sideReducer`, add these cases (next to `SET_NATURE` / `RESET_STATS`):
```ts
    case 'APPLY_SPREAD': {
      const { sp, nature } = action.payload;
      const stats = getNatureStats(nature);
      return {
        ...state,
        spHp: sp.hp, spAtk: sp.atk, spDef: sp.def, spSpa: sp.spa, spSpd: sp.spd, spSpe: sp.spe,
        nature, boostedStat: stats.boostedStat, hinderedStat: stats.hinderedStat,
      };
    }
    case 'APPLY_SAVED_BUILD': {
      const { build } = action.payload;
      const stats = getNatureStats(build.nature);
      return {
        ...state,
        spHp: build.sp.hp, spAtk: build.sp.atk, spDef: build.sp.def,
        spSpa: build.sp.spa, spSpd: build.sp.spd, spSpe: build.sp.spe,
        nature: build.nature, boostedStat: stats.boostedStat, hinderedStat: stats.hinderedStat,
        activeAbility: build.ability, item: build.item,
      };
    }
    case 'SET_SCAN_LOADED': {
      return { ...state, loadedFromScan: action.payload.val };
    }
    case 'RESET_BUILD': {
      return {
        ...state,
        spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
        nature: 'Hardy', boostedStat: null, hinderedStat: null,
        item: null, loadedFromScan: false,
      };
    }
```

- [ ] **Step 6: Run the new test + the existing calc tests**

Run: `npx vitest run src/features/damage-calculator src/features/pokemon/utils/damage.test.ts`
Expected: PASS — 5 new build-ux tests + all existing calc tests green.

- [ ] **Step 7: Commit**

```bash
git add src/features/damage-calculator/hooks/useCalculatorState.ts src/features/damage-calculator/hooks/useCalculatorState.buildux.test.ts
git commit -m "feat(calc): reducer support for spreads, saved builds, scan flag, reset"
```

---

## Task 4: `BuildPresets` control + thread through the panels

**Files:**
- Create: `src/features/damage-calculator/components/BuildPresets.tsx`
- Modify: `src/components/organisms/PokemonPanel.tsx`
- Modify: `src/features/damage-calculator/components/DefenderPanel.tsx`, `AttackerPanel.tsx`

**Interfaces:**
- Consumes: `COMMON_SPREADS` (Task 1), the `APPLY_SPREAD` action (Task 3).
- Produces: `BuildPresets` (props `{ onApplySpread(spread: Spread): void; onReset(): void }`); `PokemonPanel` gains the same two props and renders it.

- [ ] **Step 1: Create the component**

Create `src/features/damage-calculator/components/BuildPresets.tsx`:
```tsx
import React from 'react';
import { COMMON_SPREADS, type Spread } from '../utils/common-spreads';

interface Props {
  onApplySpread: (spread: Spread) => void;
  onReset: () => void;
}

const BuildPresets: React.FC<Props> = ({ onApplySpread, onReset }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-gray-500 font-semibold">Build</span>
    {COMMON_SPREADS.map((s) => (
      <button
        key={s.id}
        onClick={() => onApplySpread(s)}
        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-medium"
      >
        {s.label}
      </button>
    ))}
    <button onClick={onReset} className="px-2 py-1 rounded text-red-600 hover:bg-red-50 font-medium">
      reset
    </button>
  </div>
);

export default BuildPresets;
```

- [ ] **Step 2: Render it in `PokemonPanel`**

In `src/components/organisms/PokemonPanel.tsx`: add to the props interface:
```ts
  onApplySpread: (spread: import('@/features/damage-calculator/utils/common-spreads').Spread) => void;
  onResetBuild: () => void;
```
Add the import near the top:
```tsx
import BuildPresets from '@/features/damage-calculator/components/BuildPresets';
```
Render `<BuildPresets>` just above the SP/nature area (near where `onSpChange`/`onNatureChange` controls render — search for `onNatureChange`):
```tsx
        <BuildPresets onApplySpread={props.onApplySpread} onReset={props.onResetBuild} />
```

- [ ] **Step 3: Thread the props through `DefenderPanel` and `AttackerPanel`**

In **both** `DefenderPanel.tsx` and `AttackerPanel.tsx`, the component already builds a `side` const and passes props to `<PokemonPanel>`. Add these two props to the `Props` interface:
```ts
  onApplySpread: (side: 'p1' | 'p2', spread: import('@/features/damage-calculator/utils/common-spreads').Spread) => void;
  onResetBuild: (side: 'p1' | 'p2') => void;
```
Destructure them in the component signature, and pass to `<PokemonPanel>`:
```tsx
        onApplySpread={(spread) => onApplySpread(side, spread)}
        onResetBuild={() => onResetBuild(side)}
```

- [ ] **Step 4: Type-check (no behavior yet — DamageCalculator supplies the props next)**

Run: `npx tsc --noEmit`
Expected: errors ONLY in `DamageCalculator/index.tsx` (missing `onApplySpread`/`onResetBuild` props on `<AttackerPanel>`/`<DefenderPanel>`). That's expected — Task 5 supplies them. No errors inside the new component / panels themselves.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/BuildPresets.tsx src/components/organisms/PokemonPanel.tsx src/features/damage-calculator/components/DefenderPanel.tsx src/features/damage-calculator/components/AttackerPanel.tsx
git commit -m "feat(calc): BuildPresets control (Max HB / Max HD / reset) in the panel"
```

---

## Task 5: wire `DamageCalculator` — scan-load lookup, save-on-edit, reset + full-suite gate

**Files:**
- Modify: `src/pages/DamageCalculator/index.tsx`

**Interfaces:**
- Consumes: `loadSavedBuild`/`saveBuild`/`clearBuild` (Task 2), `Spread` (Task 1), the new actions (Task 3), `BuildPresets` props (Task 4).

- [ ] **Step 1: Imports + helpers**

In `src/pages/DamageCalculator/index.tsx` add imports:
```tsx
import { loadSavedBuild, saveBuild, clearBuild, type SavedBuild } from '@/features/damage-calculator/utils/build-store';
import type { Spread } from '@/features/damage-calculator/utils/common-spreads';
import type { SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
```
Add module-scope helpers (above the component):
```tsx
const speciesNameOf = (side: SideState, list: { id: number; nameEn: string }[]) =>
  list.find((p) => p.id === side.selectedId)?.nameEn ?? null;
const buildOf = (side: SideState): SavedBuild => ({
  nature: side.nature, ability: side.activeAbility, item: side.item,
  sp: { hp: side.spHp, atk: side.spAtk, def: side.spDef, spa: side.spSpa, spd: side.spSpd, spe: side.spSpe },
});
const isDefaultBuild = (side: SideState) =>
  side.spHp === 0 && side.spAtk === 0 && side.spDef === 0 && side.spSpa === 0 && side.spSpd === 0 && side.spSpe === 0
  && side.nature === 'Hardy' && side.item == null;
```

- [ ] **Step 2: Scan-load looks up a saved build + marks the side scan-loaded**

Replace `handleLoadDefender` and `handleLoadAttacker` with (note they become `async` and now `await` the select so abilities are loaded before applying a saved build):
```tsx
  const handleLoadDefender = async (pokemonId: number, opts?: { hpPercent?: number | null }) => {
    const p = pokemonList.find((p) => p.id === pokemonId);
    if (!p) return;
    await actions.handleSelectPokemon('p2', p);
    if (opts?.hpPercent != null) dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: opts.hpPercent } });
    const build = loadSavedBuild(p.nameEn);
    if (build) dispatch({ type: 'APPLY_SAVED_BUILD', payload: { side: 'p2', build } });
    dispatch({ type: 'SET_SCAN_LOADED', payload: { side: 'p2', val: true } });
  };

  const handleLoadAttacker = async (pokemonId: number, opts?: { hpPercent?: number | null }) => {
    const p = pokemonList.find((p) => p.id === pokemonId);
    if (!p) return;
    await actions.handleSelectPokemon('p1', p);
    if (opts?.hpPercent != null) dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p1', val: opts.hpPercent } });
    const build = loadSavedBuild(p.nameEn);
    if (build) dispatch({ type: 'APPLY_SAVED_BUILD', payload: { side: 'p1', build } });
    dispatch({ type: 'SET_SCAN_LOADED', payload: { side: 'p1', val: true } });
  };
```

- [ ] **Step 3: Persist edits of scan-loaded sides + a reset handler**

Add, alongside the other handlers/effects in the component body:
```tsx
  const persistIfScanLoaded = (side: SideState) => {
    if (!side.loadedFromScan || isDefaultBuild(side)) return;
    const species = speciesNameOf(side, pokemonList);
    if (species) saveBuild(species, buildOf(side));
  };
  useEffect(() => { persistIfScanLoaded(state.p1); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.p1.loadedFromScan, state.p1.nature, state.p1.item, state.p1.activeAbility,
     state.p1.spHp, state.p1.spAtk, state.p1.spDef, state.p1.spSpa, state.p1.spSpd, state.p1.spSpe]);
  useEffect(() => { persistIfScanLoaded(state.p2); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.p2.loadedFromScan, state.p2.nature, state.p2.item, state.p2.activeAbility,
     state.p2.spHp, state.p2.spAtk, state.p2.spDef, state.p2.spSpa, state.p2.spSpd, state.p2.spSpe]);

  const handleApplySpread = (side: 'p1' | 'p2', spread: Spread) =>
    dispatch({ type: 'APPLY_SPREAD', payload: { side, sp: spread.sp, nature: spread.nature } });
  const handleResetBuild = (side: 'p1' | 'p2') => {
    const species = speciesNameOf(state[side], pokemonList);
    if (species) clearBuild(species);
    dispatch({ type: 'RESET_BUILD', payload: { side } });
  };
```

- [ ] **Step 4: Pass the two props to both panels**

On the `<AttackerPanel ... />` and `<DefenderPanel ... />` elements, add:
```tsx
          onApplySpread={handleApplySpread}
          onResetBuild={handleResetBuild}
```

- [ ] **Step 5: Type-check + full suite**

Run: `npx tsc --noEmit`  → Expected: PASS, no errors.
Run: `npx vitest run`     → Expected: PASS, all tests green (193 existing + the new build-ux tests).

- [ ] **Step 6: Commit**

```bash
git add src/pages/DamageCalculator/index.tsx
git commit -m "feat(calc): scan-load saved builds, remember per-species edits, reset"
```

---

## Deferred / not this slice

Confidence colour-coding; species-specific auto-apply from `POKEMON_PRESETS`; offensive/extra spreads; per-field reset; cross-device sync; moves. (All in the spec's Out of scope.)

---

## Self-Review

**1. Spec coverage:**
- Clean-build-on-scan-load unless saved → Task 5 Step 2 (`loadSavedBuild` → `APPLY_SAVED_BUILD` else the `handleSelectPokemon` reset). ✓
- Max HB / Max HD one-tap (SP + nature only) → Task 1 data + Task 3 `APPLY_SPREAD` + Task 4 `BuildPresets`. ✓
- Editing (or applying a preset) on a scan-loaded side saves per species → Task 5 Step 3 effects (fires on preset apply and edits). ✓
- Per-side reset clears saved build + returns to clean default → Task 5 `handleResetBuild` (`clearBuild` + `RESET_BUILD`). ✓
- Manual selection unchanged; damage stays live → no path touches manual `handleSelectPokemon`; `loadedFromScan` stays false for manual picks. ✓
- Moves / colors / species-specific auto-apply out → not implemented. ✓

**2. Placeholder scan:** No TBD/TODO; every code step is complete; commands have expected output. The one "expected partial failure" (Task 4 Step 4 tsc) is explicitly scoped to the props DamageCalculator supplies in Task 5.

**3. Type consistency:** `SavedBuild` (build-store) is used by `APPLY_SAVED_BUILD` and `buildOf`; `Spread` (common-spreads) by `APPLY_SPREAD`, `BuildPresets`, and the panel props; `loadedFromScan` set by `SET_SCAN_LOADED`/`RESET_BUILD` and read by the persist effect; species key `nameEn` used consistently in scan-load, save, and reset. `getNatureStats` returns lowercase `def`/`atk`/`spd` — matched in the Task-3 test assertions.
