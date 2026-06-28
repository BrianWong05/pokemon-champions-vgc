# Champions calc-core correctness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Pokémon Champions damage engine correct and verifiable — a working test suite, one source of truth for SP/stat math, and `@smogon/calc` fed correct Champions final stats — pinned by tests.

**Architecture:** Champions is Gen 9 mechanically but uses Stat Points (SP) instead of EVs (66 total, cap 32/stat, IVs fixed 31, level 50). The app's stat formulas (`base+20+sp` non-HP, `base+75+sp` HP, ×nature) are already correct, but `mapToSmogonPokemon` mistakenly feeds raw SP to `@smogon/calc` as EVs, so the engine computes wrong stats. We make the Champions stat formula canonical in one module and, after constructing each `@smogon/calc` `Pokemon`, overwrite its `rawStats`/`stats` with clean Champions-computed stats (no boosts/abilities — the engine applies those itself, reading `rawStats` at gen789.js:946/1105). SP↔EV conversion is kept only for Showdown paste interop.

**Tech Stack:** TypeScript, React 19, Vite 8, `@smogon/calc` ^0.11.0, Vitest (added here), SQLite/Drizzle (untouched in this slice).

**Spec:** [docs/superpowers/specs/2026-06-28-champions-calc-core-correctness-design.md](../specs/2026-06-28-champions-calc-core-correctness-design.md)

**Branch:** `champions-calc-core` (already checked out; do NOT work on `main`).

---

## File structure

| File | Responsibility | Action |
|---|---|---|
| `vitest.config.ts` | Test runner config with `@` alias, node env | Create |
| `package.json` | Add `vitest` devDep + `test`/`test:watch` scripts | Modify |
| `src/features/pokemon/utils/champions-stats.ts` | Canonical Champions stat formulas (`championsHP`, `championsStat`) | Create |
| `src/features/pokemon/utils/champions-stats.test.ts` | Unit tests for the stat formulas | Create |
| `src/features/pokemon/utils/sp-ev-converter.ts` | Canonical SP↔EV conversion (Showdown interop only) | Keep (add tests) |
| `src/features/pokemon/utils/sp-ev-converter.test.ts` | Unit tests for SP↔EV | Create |
| `src/features/pokemon/utils/ev-conversion.ts` | Duplicate `calculateSP` | Delete |
| `src/features/pokemon/utils/showdown-parser.ts` | Repoint `calculateSP` → `convertEvToSp` | Modify (`:1`, `:101`) |
| `src/features/damage-calculator/utils/damage-calc.ts` | Delegate stat fns to canonical module; remove dead `spToEv`; override `rawStats`/`stats` in `mapToSmogonPokemon` | Modify |
| `src/features/damage-calculator/utils/champions-stats-override.test.ts` | Integration tests: override wires correct stats + damage responds to SP | Create |
| `src/features/pokemon/utils/damage.test.ts` | Fix stale `@/hooks/damage` import | Modify (`:1`) |
| `src/features/pokemon/utils/showdown-parser.test.ts` | Fix stale `@/hooks/showdown-parser` import | Modify (`:1`) |
| `src/features/pokemon/utils/showdown-formatter.test.ts` | Fix stale `@/hooks/showdown-formatter` import | Modify (`:1`) |

---

## Task 1: Stand up the test runner and revive the dead suite

The three existing `*.test.ts` files import from `@/hooks/*` paths that were moved to `@/features/...`; there is no `vitest` dependency and no `test` script, so `npx vitest run` reports "3 failed — no tests." Get the existing suite running and green first.

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Modify: `src/features/pokemon/utils/damage.test.ts:1`
- Modify: `src/features/pokemon/utils/showdown-parser.test.ts:1`
- Modify: `src/features/pokemon/utils/showdown-formatter.test.ts:1`

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm install -D vitest
```
Expected: `vitest` added to `devDependencies`, install completes without errors.

- [ ] **Step 2: Create the Vitest config with the `@` alias**

Create `vitest.config.ts` (standalone config so the full Vite plugin chain / Tailwind is not loaded for unit tests):
```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@icons': path.resolve(__dirname, './src/assets/icons'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Add test scripts to `package.json`**

In `package.json`, add to the `"scripts"` block (alongside the existing `dev`/`build`/`preview`/`type-check`):
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Fix the three stale test imports**

In `src/features/pokemon/utils/damage.test.ts`, line 1, change:
```ts
import { calculateSmogonDamage, mapToSmogonPokemon, mapToSmogonMove, mapToSmogonField } from '@/hooks/damage';
```
to:
```ts
import { calculateSmogonDamage, mapToSmogonPokemon, mapToSmogonMove, mapToSmogonField } from '@/features/damage-calculator/utils/damage-calc';
```

In `src/features/pokemon/utils/showdown-parser.test.ts`, line 1, change:
```ts
import { parseShowdownSet } from '@/hooks/showdown-parser';
```
to:
```ts
import { parseShowdownSet } from '@/features/pokemon/utils/showdown-parser';
```

In `src/features/pokemon/utils/showdown-formatter.test.ts`, line 1, change:
```ts
import { formatShowdownSet } from '@/hooks/showdown-formatter';
```
to:
```ts
import { formatShowdownSet } from '@/features/pokemon/utils/showdown-formatter';
```

- [ ] **Step 5: Run the suite — verify it now runs and passes**

Run:
```bash
npm test
```
Expected: Vitest discovers the 3 test files, they import successfully, and all tests pass (the crit test in `damage.test.ts` and the parser/formatter tests). If any test fails on its own merits (not an import error), STOP and report — that is a pre-existing logic issue to discuss, not part of this task.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/features/pokemon/utils/damage.test.ts src/features/pokemon/utils/showdown-parser.test.ts src/features/pokemon/utils/showdown-formatter.test.ts
git commit -m "test: add vitest runner and fix stale @/hooks test imports"
```

---

## Task 2: Canonical Champions stat module

Create the single source of truth for Champions stat math. These are the **clean** stats (base + SP + nature only) — no stat-stage or ability multipliers, because `@smogon/calc` applies those itself during damage calc.

**Files:**
- Create: `src/features/pokemon/utils/champions-stats.ts`
- Create: `src/features/pokemon/utils/champions-stats.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/pokemon/utils/champions-stats.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { championsHP, championsStat } from '@/features/pokemon/utils/champions-stats'

describe('championsHP', () => {
  it('is base + 75 at 0 SP', () => {
    expect(championsHP(100, 0)).toBe(175)
  })
  it('adds 1 HP per SP, max 32 SP', () => {
    expect(championsHP(100, 32)).toBe(207)
  })
})

describe('championsStat', () => {
  it('is base + 20 at 0 SP, neutral nature', () => {
    expect(championsStat(100, 0, 1.0)).toBe(120)
  })
  it('adds 1 per SP', () => {
    expect(championsStat(100, 32, 1.0)).toBe(152)
  })
  it('applies a boosting nature (x1.1) with floor', () => {
    expect(championsStat(100, 0, 1.1)).toBe(132)
  })
  it('applies a hindering nature (x0.9) with floor', () => {
    expect(championsStat(100, 0, 0.9)).toBe(108)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
npx vitest run src/features/pokemon/utils/champions-stats.test.ts
```
Expected: FAIL — cannot resolve `@/features/pokemon/utils/champions-stats` (module not created yet).

- [ ] **Step 3: Implement the module**

Create `src/features/pokemon/utils/champions-stats.ts`:
```ts
/**
 * Canonical Pokémon Champions stat formulas (Level 50, IV 31).
 * These are CLEAN stats: base + SP + nature only — no stat-stage or ability
 * multipliers. @smogon/calc applies boosts/abilities/items itself during the
 * damage calc, reading rawStats, so pre-applying them here would double-count.
 */

/** HP at Lv50/IV31: base + 75, +1 per SP. */
export const championsHP = (base: number, sp: number): number => {
  return base + 75 + sp
}

/**
 * Non-HP stat at Lv50/IV31: (base + 20 + sp) * natureMultiplier, floored.
 * natureMultiplier is 1.1 (boosted), 0.9 (hindered), or 1.0 (neutral).
 */
export const championsStat = (base: number, sp: number, natureMultiplier: number): number => {
  return Math.floor((base + 20 + sp) * natureMultiplier)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
npx vitest run src/features/pokemon/utils/champions-stats.test.ts
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/pokemon/utils/champions-stats.ts src/features/pokemon/utils/champions-stats.test.ts
git commit -m "feat: add canonical Champions stat module with tests"
```

---

## Task 3: Consolidate SP↔EV conversion

`convertSpToEv`/`convertEvToSp` in `sp-ev-converter.ts` are the canonical converters (used by `StatGrid`, `StatConverterRow`, `EvSpConverter`). A duplicate `calculateSP` lives in `ev-conversion.ts` and is used only by `showdown-parser.ts`. `calculateSP(ev) = floor((ev+4)/8)` is identical to `convertEvToSp(ev)`. Repoint the one caller, delete the duplicate, and lock the converter behaviour with tests.

**Files:**
- Create: `src/features/pokemon/utils/sp-ev-converter.test.ts`
- Modify: `src/features/pokemon/utils/showdown-parser.ts:1` and `:101`
- Delete: `src/features/pokemon/utils/ev-conversion.ts`

- [ ] **Step 1: Write the failing tests for the canonical converter**

Create `src/features/pokemon/utils/sp-ev-converter.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { convertSpToEv, convertEvToSp } from '@/features/pokemon/utils/sp-ev-converter'

describe('convertSpToEv (official Pokémon HOME mapping)', () => {
  it('maps 0 SP to 0 EV', () => {
    expect(convertSpToEv(0)).toBe(0)
  })
  it('maps the first SP to 4 EV, then +8 each', () => {
    expect(convertSpToEv(1)).toBe(4)
    expect(convertSpToEv(2)).toBe(12)
    expect(convertSpToEv(31)).toBe(244)
  })
  it('caps 32 SP at 252 EV', () => {
    expect(convertSpToEv(32)).toBe(252)
  })
})

describe('convertEvToSp', () => {
  it('maps boundary EV values back to SP', () => {
    expect(convertEvToSp(0)).toBe(0)
    expect(convertEvToSp(4)).toBe(1)
    expect(convertEvToSp(12)).toBe(2)
    expect(convertEvToSp(252)).toBe(32)
  })
})

describe('SP↔EV round-trip', () => {
  it('round-trips at boundaries', () => {
    for (const sp of [0, 1, 2, 31, 32]) {
      expect(convertEvToSp(convertSpToEv(sp))).toBe(sp)
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify they pass (converter already exists)**

Run:
```bash
npx vitest run src/features/pokemon/utils/sp-ev-converter.test.ts
```
Expected: PASS — `sp-ev-converter.ts` already implements these. (If any fail, STOP — the converter has a bug to discuss before deleting the duplicate.)

- [ ] **Step 3: Repoint `showdown-parser.ts` to the canonical converter**

In `src/features/pokemon/utils/showdown-parser.ts`, line 1, change:
```ts
import { calculateSP } from '@/features/pokemon/utils/ev-conversion';
```
to:
```ts
import { convertEvToSp } from '@/features/pokemon/utils/sp-ev-converter';
```

In the same file, line 101, change:
```ts
          parsed.evs[key] = calculateSP(tempVals[key]);
```
to:
```ts
          parsed.evs[key] = convertEvToSp(tempVals[key]);
```

- [ ] **Step 4: Delete the duplicate module**

Run:
```bash
git rm src/features/pokemon/utils/ev-conversion.ts
```

- [ ] **Step 5: Verify nothing else imported the duplicate, then run tests + type-check**

Run:
```bash
grep -rn "ev-conversion\|calculateSP" src ; echo "exit: $?"
npx vitest run
npm run type-check
```
Expected: the grep prints **no** matches (a non-zero exit from grep with no output is correct); all tests pass; `type-check` passes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: consolidate SP/EV conversion, remove duplicate ev-conversion"
```

---

## Task 4: Fix the damage path — feed @smogon/calc correct Champions stats

This is the core correctness fix. `mapToSmogonPokemon` currently passes raw SP (0–32) as `evs`, so `@smogon/calc` computes stats from `mainline(base, SP-as-EV, nature)` — wrong. We overwrite the constructed `Pokemon`'s `rawStats`/`stats` with clean Champions stats. The gen789 mechanics read `rawStats[stat]` and apply boosts themselves, so the override must exclude boosts/abilities. Also delegate the existing display helpers to the canonical module and remove the dead `spToEv`.

**Files:**
- Modify: `src/features/damage-calculator/utils/damage-calc.ts`
- Create: `src/features/damage-calculator/utils/champions-stats-override.test.ts`

- [ ] **Step 1: Write the failing integration tests**

Create `src/features/damage-calculator/utils/champions-stats-override.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mapToSmogonPokemon, mapToSmogonMove, mapToSmogonField, calculateSmogonDamage } from '@/features/damage-calculator/utils/damage-calc'
import { championsStat, championsHP } from '@/features/pokemon/utils/champions-stats'

const stateFor = (overrides: Record<string, unknown> = {}) => ({
  isTypeOverridden: false,
  type1: 'dragon', type2: 'ground',
  baseHp: 100, baseAtk: 100, baseDef: 100, baseSpa: 100, baseSpd: 100, baseSpe: 100,
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
  stages: {},
  boostedStat: null, hinderedStat: null,
  hpPercent: 100,
  activeAbility: null, item: null,
  isReflect: false, isLightScreen: false, isAuroraVeil: false,
  isHelpingHand: false, isFriendGuard: false, isTailwind: false,
  ...overrides,
})

describe('mapToSmogonPokemon Champions stat override', () => {
  it('pins rawStats to hand-computed Champions stats (not SP-as-EV)', () => {
    const p = mapToSmogonPokemon(stateFor({ spAtk: 32 }), 'Garchomp', 'dragon', 'ground')
    // Champions: (100 + 20 + 32) * 1.0 = 152.  The OLD SP-as-EV path gave 124.
    expect(p.rawStats.atk).toBe(championsStat(100, 32, 1.0))
    expect(p.rawStats.atk).toBe(152)
    expect(p.rawStats.hp).toBe(championsHP(100, 0))
    expect(p.rawStats.hp).toBe(175)
  })

  it('applies nature to the overridden stat', () => {
    const p = mapToSmogonPokemon(stateFor({ boostedStat: 'atk', hinderedStat: 'spa' }), 'Garchomp', 'dragon', 'ground')
    expect(p.rawStats.atk).toBe(championsStat(100, 0, 1.1)) // 132
    expect(p.rawStats.spa).toBe(championsStat(100, 0, 0.9)) // 108
  })
})

describe('damage responds to SP investment (proves override reaches the calc)', () => {
  it('more attacker SP yields more damage', () => {
    const defender = mapToSmogonPokemon(stateFor({}), 'Tyranitar', 'rock', 'dark')
    const move = mapToSmogonMove('Earthquake', false)
    const field = mapToSmogonField('None', false, false, false, false, 'None', false, {}, {})

    const lowAtk = mapToSmogonPokemon(stateFor({ spAtk: 0 }), 'Garchomp', 'dragon', 'ground')
    const highAtk = mapToSmogonPokemon(stateFor({ spAtk: 32 }), 'Garchomp', 'dragon', 'ground')

    const lowDmg = (calculateSmogonDamage(lowAtk, defender, move, field).damage as number[])[0]
    const highDmg = (calculateSmogonDamage(highAtk, defender, move, field).damage as number[])[0]

    expect(highDmg).toBeGreaterThan(lowDmg)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
npx vitest run src/features/damage-calculator/utils/champions-stats-override.test.ts
```
Expected: FAIL — `p.rawStats.atk` is currently 124 (mainline-from-SP-as-EV), not 152.

- [ ] **Step 3: Delegate the display helpers to the canonical module**

In `src/features/damage-calculator/utils/damage-calc.ts`, add an import at the top (after the existing `@smogon/calc` import on line 1):
```ts
import { championsHP, championsStat } from '@/features/pokemon/utils/champions-stats';
```

Replace the existing `calculateHP` (lines 7–9) with a delegation:
```ts
export const calculateHP = (base: number, sp: number): number => {
  return championsHP(base, sp);
};
```

Replace the existing `calculateStat` (lines 11–21) with a version that delegates the base formula to `championsStat` and keeps the stage/ability behaviour for display callers:
```ts
export const calculateStat = (
  base: number,
  sp: number,
  nature: number,
  stage: number = 0,
  abilityMultiplier: number = 1.0
): number => {
  const raw = championsStat(base, sp, nature);
  const withStage = Math.floor(raw * getStageMultiplier(stage));
  return Math.floor(withStage * abilityMultiplier);
};
```

- [ ] **Step 4: Remove the dead `spToEv` helper**

In `src/features/damage-calculator/utils/damage-calc.ts`, delete the now-unused `spToEv` function (lines 80–83):
```ts
export const spToEv = (sp: number): number => {
  if (sp === 0) return 0;
  return Math.min(252, sp * 8 - 4);
};
```
(Verified: no file imports `spToEv`.)

- [ ] **Step 5: Override `rawStats`/`stats` inside `mapToSmogonPokemon`**

In `src/features/damage-calculator/utils/damage-calc.ts`, in `mapToSmogonPokemon`, immediately before the final `return p;` (currently line 275), insert:
```ts
  // Champions correctness: @smogon/calc otherwise computes stats from the
  // mainline EV formula using raw SP as EVs, which is wrong. Overwrite with the
  // clean Champions stats (base + SP + nature, no boosts/abilities). The gen9
  // mechanics read rawStats and apply boosts/abilities/items themselves
  // (gen789.js:946,1105), so excluding them here avoids double-counting.
  const natureMult = (statKey: 'atk' | 'def' | 'spa' | 'spd' | 'spe'): number => {
    if (stateSide.boostedStat === statKey) return 1.1;
    if (stateSide.hinderedStat === statKey) return 0.9;
    return 1.0;
  };
  const championsStats = {
    hp: championsHP(stateSide.baseHp, stateSide.spHp || 0),
    atk: championsStat(stateSide.baseAtk, stateSide.spAtk || 0, natureMult('atk')),
    def: championsStat(stateSide.baseDef, stateSide.spDef || 0, natureMult('def')),
    spa: championsStat(stateSide.baseSpa, stateSide.spSpa || 0, natureMult('spa')),
    spd: championsStat(stateSide.baseSpd, stateSide.spSpd || 0, natureMult('spd')),
    spe: championsStat(stateSide.baseSpe, stateSide.spSpe || 0, natureMult('spe')),
  };
  p.rawStats = { ...championsStats } as typeof p.rawStats;
  p.stats = { ...championsStats } as typeof p.stats;
  p.originalCurHP = Math.floor(championsStats.hp * (stateSide.hpPercent / 100));
```

- [ ] **Step 6: Run the new tests to verify they pass**

Run:
```bash
npx vitest run src/features/damage-calculator/utils/champions-stats-override.test.ts
```
Expected: PASS — `rawStats.atk` is now 152, nature variants match, and damage increases with SP.

- [ ] **Step 7: Run the full suite + type-check (no regressions)**

Run:
```bash
npm test
npm run type-check
```
Expected: all tests pass (including the original crit test, which still holds since the override applies neutral stats there); `type-check` passes.

- [ ] **Step 8: Commit**

```bash
git add src/features/damage-calculator/utils/damage-calc.ts src/features/damage-calculator/utils/champions-stats-override.test.ts
git commit -m "fix: feed @smogon/calc correct Champions stats via rawStats override"
```

---

## Task 5: Manual parity check, full verification, and spec sign-off

The unit tests prove the Champions stat math; combined with `@smogon/calc`'s trusted Gen 9 damage formula, the damage output is correct by construction. This task adds an external cross-check against a trusted Champions calculator and a final full verification.

**Files:**
- Modify: `docs/superpowers/specs/2026-06-28-champions-calc-core-correctness-design.md` (status line)

- [ ] **Step 1: Build the app to confirm nothing broke**

Run:
```bash
npm run build
```
Expected: `tsc` + `vite build` succeed.

- [ ] **Step 2: Manual parity check against a trusted Champions calc**

Pick three real matchups and compute each in BOTH the app's calculator (`npm run dev`, open the Damage Calculator) and a trusted Champions calculator (ChampDex `https://champdex.com/tools/calc` or NCP `https://nerd-of-now.github.io/NCP-VGC-Damage-Calculator/`). Use identical inputs (species, SP spread, nature, item, move, field). Suggested coverage:
  1. Neutral, no investment (e.g. Garchomp Earthquake vs Amoonguss, 0 SP both).
  2. Max attacker SP + boosting nature + super-effective (e.g. 32-SP +Atk Garchomp Earthquake vs Heatran).
  3. A spread move in doubles with a defensive SP investment.

For each, confirm the damage **percentage range** matches the trusted calc (small rounding differences of ±1% on the boundary roll are acceptable; structural mismatches are not). Record the three comparisons (inputs, app result, reference result, pass/fail) in the PR description / handoff notes. If any structural mismatch appears, STOP and report — it indicates a remaining engine issue to debug before sign-off.

- [ ] **Step 3: Mark the spec slice done**

In `docs/superpowers/specs/2026-06-28-champions-calc-core-correctness-design.md`, change the status line near the top from:
```markdown
Status: draft for review
```
to:
```markdown
Status: Spec 1 implemented (calc-core correctness) — 2026-06-29
```

- [ ] **Step 4: Final full verification**

Run:
```bash
npm test
npm run type-check
npm run build
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-06-28-champions-calc-core-correctness-design.md
git commit -m "docs: mark Champions calc-core correctness slice implemented"
```

---

## Completion

After all tasks pass, use **superpowers:finishing-a-development-branch** to verify tests and decide how to integrate the `champions-calc-core` branch (merge / PR / continue with Spec 2: Champions dataset).
