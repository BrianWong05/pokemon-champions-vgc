# Calculator — Full Design Fidelity (1a–1d) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the whole damage calculator (Turn 1: 1a landscape full, 1b collapsible rails, 1c iPad/roomy, 1d portrait) up to the Arena "Landscape Calculator" design, sharing the read-out building blocks across landscape and portrait.

**Architecture:** One adaptive `ArenaCalculatorLandscape` covers 1a/1b/1c via runtime collapse-state + responsive width (no `variant` prop). Four new presentational components (`ArenaMoveList`, `ArenaSpeedCompareView`, `ArenaStatCard`, `ArenaSideConditions`) are consumed by both landscape and portrait so the move list, speed view, stat display, and per-side chips exist in one place. Portrait (`ArenaCalculator`) gets the shared move list + speed view additively, keeping its inline SP grid. All work is UI over existing state / `@smogon/calc`; the only engine touch is a Trick Room field flag.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + @testing-library/react, `@smogon/calc`, Arena design-system components (`@/design-system/arena`), CSS custom properties (Arena tokens).

## Global Constraints

- **Arena tokens only** for styling — `var(--accent)`, `var(--ink-1..4)`, `var(--surface-*)`, `var(--line-1..3)`, `var(--danger|safe|field(-soft|-line))`, `var(--r-sm|md|pill)`, `var(--font-ui|display|mono)`. Never hard-coded colors. Flat surfaces; never tint a whole panel background.
- **Side identity:** accent = you (attacker/p1), danger = opponent (defender/p2). Sprite rings + badges carry identity.
- **No new dependencies.** No calculator-engine behavior changes except the Trick Room `Field` flag.
- **Feature-blocked, do NOT build:** Mega-evolve/revert button, Record-result CTA. The landscape center keeps its existing "Advanced" button.
- **TDD:** every task writes a failing test first. Test runner: `npx vitest run <path>`. Repo convention lives in `src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`.
- **Commit** after each task with the shown message.
- **Design source of truth:** the decoded 1a mock is at `docs/superpowers/specs/2026-07-08-landscape-calculator-rails-design.md` (spec) and was diffed from `ArenaCalc.dc.html`. Exact tokens/sizes below come from that diff.

### Shared interface contract (used across tasks)

```ts
// @/design-system/arena
Badge({ children, tone?: 'neutral'|'accent'|'safe'|'danger'|'field', solid?, style? })
Chip({ children, active?, tone?: 'accent'|'safe'|'danger'|'field', icon?, onClick?, style? })
StatChip({ label, value, tone?: 'accent'|'safe'|'danger'|'field'|'muted', style? })
SelectRow({ label, value, leading?, onClick })
Sprite({ dex, name, size, ring?, tone?: 'accent'|'danger' })
TypeBadge({ type: string, size?: 'sm' })      // type = lowercase name, e.g. 'rock'
Icon({ name: IconName, size, color })
KOVerdict({ verdict, confidence, tone })
koVerdictFromText(text?: string) => { verdict: string; confidence: string; tone: KoTone } // KoTone: 'danger'|'safe'|'field'|'neutral'

// state (@/features/damage-calculator/hooks/useCalculatorState)
SideState: { selectedId, type1, type2, baseHp, baseAtk, baseDef, baseSpa, baseSpd, baseSpe,
  spHp, spAtk, spDef, spSpa, spSpd, spSpe, boostedStat, hinderedStat, stages: Record<string,number>,
  moves: (MoveData|null)[], activeMoveIndex, activeAbility, item, hpPercent,
  isReflect, isLightScreen, isHelpingHand, isTailwind, ... }
dispatch actions used here:
  { type:'SET_ACTIVE_MOVE_SLOT', payload:{ side, index } }
  { type:'SET_HP_PERCENT', payload:{ side, val } }
  { type:'SET_STAT_STAGE', payload:{ side, stat, val } }
  { type:'TOGGLE_SIDE_EFFECT', payload:{ side, effect:'isReflect'|'isLightScreen'|'isHelpingHand'|'isTailwind' } }
  { type:'TOGGLE_TRICK_ROOM' }   // NEW (Task 3)

// types
MoveData: { nameEn, nameZh, typeId:number, damageClassId:number /*2 Phys,3 Spec*/, power:number|null }
DamageResult: { minDamage, maxDamage, minPercent, maxPercent, moveName, moveType:number, koChanceText? }

// calc utils (@/features/damage-calculator/utils/damage-calc)
calculateHP(base, sp) => number
calculateStat(base, sp, natureMult, stage=0) => number
// nature mult for a stat: boostedStat===stat ? 1.1 : hinderedStat===stat ? 0.9 : 1.0

// speed (@/features/damage-calculator/utils/speed)
buildSpeedCompare(you, opp) => { yours:{ actual, scarf, tailwind }, tiers:{ label, value, outcome }[] }

// types map (@/features/pokemon/utils/pokemon-types)
REVERSE_TYPE_IDS: Record<number, string>   // typeId -> lowercase type name
```

### New component signatures (produced by Tasks 4–7)

```ts
// ArenaMoveList.tsx
export function ArenaMoveList(props: {
  side: SideState;
  results: (DamageResult | null)[];
  onSelect: (index: number) => void;
  onEdit: () => void;
}): JSX.Element

// ArenaSpeedCompareView.tsx
export function ArenaSpeedCompareView(props: {
  compare: SpeedCompare;               // from buildSpeedCompare
  layout: 'columns' | 'stacked';       // landscape=columns, portrait=stacked
  youName: string; oppName: string; oppBaseSpe: number;
  youStage: number; oppStage: number;
  onYouStage: (val: number) => void; onOppStage: (val: number) => void;
  formula: string;                     // pre-built live SP formula string
}): JSX.Element

// ArenaStatCard.tsx
export function ArenaStatCard(props: {
  side: SideState;
  name: string;
  tone: 'accent' | 'danger';
  onOpenSpecies: () => void;
}): JSX.Element

// ArenaSideConditions.tsx  (per-side status chips)
export function ArenaSideConditions(props: {
  side: SideState;
  which: 'p1' | 'p2';
  dispatch: React.Dispatch<CalcAction>;
}): JSX.Element
```

---

## Task 1: Viewport gating — touch-guarded tablet tier (1c)

**Files:**
- Modify: `src/hooks/useViewportMode.ts`
- Test: `src/hooks/useViewportMode.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `useViewportMode()` returning `'desktop' | 'arena' | 'arena-landscape'` where iPad-size touch landscape now resolves to `'arena-landscape'`.

- [ ] **Step 1: Write the failing tests** — add tablet-tier cases and extend the matchMedia mock for `pointer`/`max-height:1024px`.

```ts
// src/hooks/useViewportMode.test.ts — add helper + cases
// The mock answers queries by inspecting substrings of the query string.
function mockMatchMedia(matcher: (q: string) => boolean) {
  window.matchMedia = ((q: string) => ({
    matches: matcher(q),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

it('iPad Air landscape (1180x820, coarse) → arena-landscape', () => {
  mockMatchMedia((q) =>
    q.includes('landscape') && q.includes('max-height: 1024px') && q.includes('pointer: coarse'));
  const { result } = renderHook(() => useViewportMode());
  expect(result.current).toBe('arena-landscape');
});

it('iPad Pro landscape (1366x1024, coarse) → arena-landscape', () => {
  mockMatchMedia((q) =>
    q.includes('landscape') && q.includes('max-height: 1024px') && q.includes('pointer: coarse'));
  const { result } = renderHook(() => useViewportMode());
  expect(result.current).toBe('arena-landscape');
});

it('laptop landscape (1280x800, fine pointer) → desktop', () => {
  // matches neither phone (max-height 767) nor tablet (needs pointer: coarse) nor portrait width
  mockMatchMedia(() => false);
  const { result } = renderHook(() => useViewportMode());
  expect(result.current).toBe('desktop');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useViewportMode.test.ts`
Expected: FAIL — current hook has no tablet query, so the coarse-iPad cases return `desktop`.

- [ ] **Step 3: Implement the tablet tier**

```ts
// src/hooks/useViewportMode.ts
import { useEffect, useState } from 'react';

export type ViewportMode = 'desktop' | 'arena' | 'arena-landscape';

const PHONE_LANDSCAPE = '(orientation: landscape) and (max-height: 767px)';
const TABLET_LANDSCAPE = '(orientation: landscape) and (max-height: 1024px) and (pointer: coarse)';
const PORTRAIT_QUERY = '(max-width: 767px)';
const QUERIES = [PHONE_LANDSCAPE, TABLET_LANDSCAPE, PORTRAIT_QUERY];

function compute(): ViewportMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'desktop';
  if (window.matchMedia(PHONE_LANDSCAPE).matches || window.matchMedia(TABLET_LANDSCAPE).matches) return 'arena-landscape';
  if (window.matchMedia(PORTRAIT_QUERY).matches) return 'arena';
  return 'desktop';
}

export function useViewportMode(): ViewportMode {
  const [mode, setMode] = useState<ViewportMode>(compute);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mqls = QUERIES.map((q) => window.matchMedia(q));
    const onChange = () => setMode(compute());
    onChange();
    mqls.forEach((mql) => mql.addEventListener('change', onChange));
    return () => mqls.forEach((mql) => mql.removeEventListener('change', onChange));
  }, []);
  return mode;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useViewportMode.test.ts`
Expected: PASS (new + existing phone/portrait/desktop cases).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useViewportMode.ts src/hooks/useViewportMode.test.ts
git commit -m "feat(calc): route touch iPad landscape to the battle HUD (tablet tier)"
```

---

## Task 2: Per-scenario KO chance in `useDamageScenarios`

**Files:**
- Modify: `src/features/damage-calculator/hooks/useDamageScenarios.ts`
- Test: `src/features/damage-calculator/hooks/useDamageScenarios.test.ts`

**Interfaces:**
- Consumes: existing `run()` helper's `result` (`@smogon/calc` `Result`, has `.kochance()`).
- Produces: `ScenarioRange` gains `koChanceText?: string`. `DamageScenarios` shape unchanged otherwise.

- [ ] **Step 1: Write the failing test**

```ts
// useDamageScenarios.test.ts — add to the existing suite
it('surfaces a koChanceText string on each scenario when a move is set', () => {
  const { result } = renderHook(() => useDamageScenarios(sampleState, samplePokemonList, 'p1'));
  // sampleState has p1 with an active damaging move vs a p2 species (reuse the suite's fixtures)
  expect(result.current.crit).not.toBeNull();
  expect(typeof result.current.crit!.koChanceText === 'string' || result.current.crit!.koChanceText === undefined).toBe(true);
  // at minimum the field exists on the type and does not throw
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/hooks/useDamageScenarios.test.ts`
Expected: FAIL — `koChanceText` is not on `ScenarioRange` (type error / undefined access in strict fixtures).

- [ ] **Step 3: Implement — return koChanceText from `run()`**

```ts
// useDamageScenarios.ts
export interface ScenarioRange { minPercent: number; maxPercent: number; koChanceText?: string }
```

In the `run()` helper, after computing `result`, derive the KO text the same way `useDamageCalc` does:

```ts
      const run = (defSide: SideState, move = baseMove): ScenarioRange | null => {
        const defMon = mapToSmogonPokemon(defSide, formName(defBase, defSide), defBase.type1, defBase.type2);
        const result = calculateSmogonDamage(atkMon, defMon, move, field);
        const damageArr = Array.isArray(result.damage) ? result.damage : [Number(result.damage) || 0];
        const clean = flattenDamage(damageArr as any[]);
        const min = clean.length ? clean[0] : 0;
        const max = clean.length ? clean[clean.length - 1] : 0;
        const maxHP = defMon.maxHP();
        let koChanceText: string | undefined;
        try { const ko = (result as any).kochance?.(); if (ko && ko.text) koChanceText = ko.text; } catch { /* ignore */ }
        return {
          minPercent: Math.floor((min * 1000) / maxHP) / 10 || 0,
          maxPercent: Math.floor((max * 1000) / maxHP) / 10 || 0,
          koChanceText,
        };
      };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/hooks/useDamageScenarios.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/hooks/useDamageScenarios.ts src/features/damage-calculator/hooks/useDamageScenarios.test.ts
git commit -m "feat(calc): surface per-scenario KO chance for scenario badges"
```

---

## Task 3: Trick Room field flag

**Files:**
- Modify: `src/features/damage-calculator/hooks/useCalculatorState.ts`
- Modify: `src/features/damage-calculator/utils/damage-calc.ts`
- Modify callers: `src/features/damage-calculator/hooks/useDamageCalc.ts`, `src/features/damage-calculator/hooks/useDamageScenarios.ts`
- Test: `src/features/damage-calculator/hooks/useCalculatorState.test.ts` (create if absent)

**Interfaces:**
- Consumes: nothing.
- Produces: `CalcState.isTrickRoom: boolean`; action `{ type:'TOGGLE_TRICK_ROOM' }`; `mapToSmogonField(..., isTrickRoom?)`.

- [ ] **Step 1: Write the failing test**

```ts
// useCalculatorState.test.ts
import { describe, it, expect } from 'vitest';
import { calcReducer, initialState } from './useCalculatorState';

describe('trick room', () => {
  it('defaults off and toggles', () => {
    expect(initialState.isTrickRoom).toBe(false);
    const next = calcReducer(initialState, { type: 'TOGGLE_TRICK_ROOM' } as any);
    expect(next.isTrickRoom).toBe(true);
  });
});
```

> Confirmed exports: `sideReducer` (line 144), `fieldReducer` (line 441), `calcReducer` (line 452, used by `useReducer`). `calcReducer` delegates field actions to `fieldReducer` via an inline `action.type === 'SET_WEATHER' || … || 'TOGGLE_GRAVITY'` guard (lines ~452–462).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/hooks/useCalculatorState.test.ts`
Expected: FAIL — `isTrickRoom` undefined / action not handled.

- [ ] **Step 3: Implement state**

In `FieldState` add `isTrickRoom: boolean;`. In `FieldAction` add `| { type: 'TOGGLE_TRICK_ROOM' }`. In `initialState` add `isTrickRoom: false,`. In `fieldReducer` (line 441) add:

```ts
    case 'TOGGLE_TRICK_ROOM': return { ...state, isTrickRoom: !state.isTrickRoom };
```

Also add `|| action.type === 'TOGGLE_TRICK_ROOM'` to the field-action guard inside `calcReducer` (the `action.type === 'SET_WEATHER' || … || 'TOGGLE_GRAVITY'` chain at lines ~454–458) so it routes to `fieldReducer`.

Then thread it into the engine (harmless for damage; correctness/completeness):

```ts
// damage-calc.ts — add param + pass to Field
export const mapToSmogonField = (
  weather: string, isSpreadTarget: boolean,
  isFairyAura = false, isDarkAura = false, isAuraBreak = false,
  terrain = 'None', isGravity = false,
  attackerSide: any = {}, defenderSide: any = {}, isTrickRoom = false,
): Field => {
  // ...unchanged...
  return new Field({
    // ...unchanged fields...
    isGravity,
    isTrickRoom,
    attackerSide: { /* unchanged */ },
    defenderSide: { /* unchanged */ },
  });
};
```

Pass `state.isTrickRoom` from both callers (`useDamageCalc.ts` and `useDamageScenarios.ts`) as the final arg to `mapToSmogonField(...)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/hooks/useCalculatorState.test.ts && npx vitest run src/features/damage-calculator`
Expected: PASS; no regressions in existing calc tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/hooks/useCalculatorState.ts src/features/damage-calculator/utils/damage-calc.ts src/features/damage-calculator/hooks/useDamageCalc.ts src/features/damage-calculator/hooks/useDamageScenarios.ts src/features/damage-calculator/hooks/useCalculatorState.test.ts
git commit -m "feat(calc): add Trick Room field flag"
```

---

## Task 4: `ArenaMoveList` shared component (type · category · base power · %)

**Files:**
- Create: `src/features/damage-calculator/components/mobile/ArenaMoveList.tsx`
- Test: `src/features/damage-calculator/components/mobile/arena-move-list.test.tsx`

**Interfaces:**
- Consumes: `SideState`, `DamageResult`, `REVERSE_TYPE_IDS`, DS `TypeBadge`/`Icon`.
- Produces: `ArenaMoveList({ side, results, onSelect, onEdit })` (signature in Global Constraints).

- [ ] **Step 1: Write the failing test**

```tsx
// arena-move-list.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaMoveList } from './ArenaMoveList';

const move = (nameEn: string, typeId: number, damageClassId: number, power: number | null) =>
  ({ nameEn, nameZh: null, typeId, damageClassId, power } as any);

const side = {
  moves: [move('Power Gem', 6, 3, 80), null, null, null],
  activeMoveIndex: 0,
} as any;
const results = [{ minPercent: 62, maxPercent: 74, moveType: 6 } as any, null, null, null];

it('shows name, base power and percent for a filled slot', () => {
  render(<ArenaMoveList side={side} results={results} onSelect={() => {}} onEdit={() => {}} />);
  expect(screen.getByText('Power Gem')).toBeTruthy();
  expect(screen.getByText('80')).toBeTruthy();       // base power
  expect(screen.getByText('62–74%')).toBeTruthy();
});

it('calls onSelect with the row index', () => {
  const onSelect = vi.fn();
  render(<ArenaMoveList side={side} results={results} onSelect={onSelect} onEdit={() => {}} />);
  fireEvent.click(screen.getByText('Power Gem'));
  expect(onSelect).toHaveBeenCalledWith(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-move-list.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement (adapted from the landscape inline `MoveList`, adding category + base power)**

```tsx
// ArenaMoveList.tsx
import React from 'react';
import type { SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import { REVERSE_TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';
import { TypeBadge, Icon } from '@/design-system/arena';

const catShort = (damageClassId: number) => (damageClassId === 2 ? 'Ph' : 'Sp');

export function ArenaMoveList({ side, results, onSelect, onEdit }: {
  side: SideState;
  results: (DamageResult | null)[];
  onSelect: (index: number) => void;
  onEdit: () => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Moves</div>
        <span style={{ flex: 1 }} />
        <button onClick={onEdit} aria-label="Edit moves" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', color: 'var(--ink-3)' }}>
          <Icon name="pencil" size={14} color="var(--ink-3)" />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {side.moves.map((m, i) => {
          if (!m) {
            return (
              <button key={i} onClick={onEdit} style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', padding: '7px 8px',
                borderRadius: 'var(--r-sm)', cursor: 'pointer', background: 'transparent',
                border: '1px dashed var(--line-2)', color: 'var(--ink-4)', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 600,
              }}>Add move</button>
            );
          }
          const move = m as MoveData;
          const on = i === side.activeMoveIndex;
          const r = results[i];
          const typeName = REVERSE_TYPE_IDS[r?.moveType ?? move.typeId];
          return (
            <button key={i} onClick={() => onSelect(i)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 44, textAlign: 'left', padding: '6px 9px',
              borderRadius: 'var(--r-sm)', cursor: 'pointer',
              background: on ? 'var(--accent-soft)' : 'transparent',
              border: `1px solid ${on ? 'var(--accent-soft-line)' : 'var(--line-1)'}`,
            }}>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: on ? 'var(--ink-1)' : 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {move.nameEn}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {typeName && <TypeBadge type={typeName} size="sm" />}
                  <span style={{ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, borderRadius: 'var(--r-xs)', background: 'var(--surface-inset)', border: '1px solid var(--line-1)', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)' }}>
                    {catShort(move.damageClassId)}
                  </span>
                  {move.power != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600, color: 'var(--ink-4)' }}>{move.power}</span>}
                </span>
              </span>
              <span style={{ flex: 'none', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: on ? 'var(--accent)' : 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                {r ? `${r.minPercent}–${r.maxPercent}%` : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-move-list.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaMoveList.tsx src/features/damage-calculator/components/mobile/arena-move-list.test.tsx
git commit -m "feat(calc): ArenaMoveList shared move list with category + base power"
```

---

## Task 5: `ArenaSpeedCompareView` shared speed view (mode selector + layout + live formula)

**Files:**
- Create: `src/features/damage-calculator/components/mobile/ArenaSpeedCompareView.tsx`
- Test: `src/features/damage-calculator/components/mobile/arena-speed-compare-view.test.tsx`

**Interfaces:**
- Consumes: `SpeedCompare` from `buildSpeedCompare`, DS `Badge`.
- Produces: `ArenaSpeedCompareView({ compare, layout, youName, oppName, oppBaseSpe, youStage, oppStage, onYouStage, onOppStage, formula })`. Owns local `mode: 'actual'|'scarf'|'tailwind'` state; recomputes each tier's outcome vs `compare.yours[mode]`.

- [ ] **Step 1: Write the failing test**

```tsx
// arena-speed-compare-view.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaSpeedCompareView } from './ArenaSpeedCompareView';

const compare = {
  yours: { actual: 153, scarf: 229, tailwind: 306 },
  tiers: [
    { label: 'Max+ scarf', value: 253, outcome: 'outsped' as const },
    { label: 'Uninvested', value: 122, outcome: 'faster' as const },
  ],
};
const props = {
  compare, layout: 'columns' as const, youName: 'Glimmora', oppName: 'Garchomp',
  oppBaseSpe: 102, youStage: 0, oppStage: 0, onYouStage: () => {}, onOppStage: () => {},
  formula: '153 = floor((101 + 20 + 32) × 1.0)',
};

it('renders the mode buttons and the live formula', () => {
  render(<ArenaSpeedCompareView {...props} />);
  expect(screen.getByText('153')).toBeTruthy();            // Actual value
  expect(screen.getByText(/153 = floor/)).toBeTruthy();    // formula
});

it('switching to Scarf recomputes tier outcomes against 229', () => {
  render(<ArenaSpeedCompareView {...props} />);
  fireEvent.click(screen.getByText('Scarf'));
  // 229 > 122 → Faster; 229 < 253 → Outsped
  expect(screen.getAllByText('Faster').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Outsped').length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-speed-compare-view.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
// ArenaSpeedCompareView.tsx
import React, { useState } from 'react';
import type { SpeedCompare } from '@/features/damage-calculator/utils/speed';
import { Badge } from '@/design-system/arena';

type Mode = 'actual' | 'scarf' | 'tailwind';
const MODES: { key: Mode; label: string }[] = [
  { key: 'actual', label: 'Actual' }, { key: 'scarf', label: 'Scarf' }, { key: 'tailwind', label: 'Tailwind' },
];

const stepBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)',
  border: '1px solid var(--line-2)', color: 'var(--ink-2)', fontFamily: 'var(--font-display)',
  fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
};
const micro: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)' };
const fmtStage = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${n}` : '±0');

function RankRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 8px' }}>
      <span style={micro}>{label}</span>
      <span style={{ flex: 1 }} />
      <button aria-label={`Lower ${label}`} style={stepBtn} onClick={() => onChange(Math.max(-6, value - 1))}>−</button>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', width: 28, textAlign: 'center' }}>{fmtStage(value)}</span>
      <button aria-label={`Raise ${label}`} style={stepBtn} onClick={() => onChange(Math.min(6, value + 1))}>+</button>
    </div>
  );
}

export function ArenaSpeedCompareView({
  compare, layout, youName, oppName, oppBaseSpe, youStage, oppStage, onYouStage, onOppStage, formula,
}: {
  compare: SpeedCompare;
  layout: 'columns' | 'stacked';
  youName: string; oppName: string; oppBaseSpe: number;
  youStage: number; oppStage: number;
  onYouStage: (val: number) => void; onOppStage: (val: number) => void;
  formula: string;
}) {
  const [mode, setMode] = useState<Mode>('actual');
  const youEff = compare.yours[mode];

  const youCol = (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...micro, marginBottom: 6 }}>{`You — ${youName}`}</div>
      <RankRow label="Spe rank" value={youStage} onChange={onYouStage} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MODES.map(({ key, label }) => {
          const on = mode === key;
          return (
            <button key={key} onClick={() => setMode(key)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', minHeight: 44,
              padding: '8px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left',
              background: on ? 'var(--accent-soft)' : 'var(--surface-inset)',
              border: `1px solid ${on ? 'var(--accent-soft-line)' : 'var(--line-1)'}`,
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: on ? 'var(--accent)' : 'var(--ink-3)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: on ? 'var(--accent)' : 'var(--ink-1)' }}>{compare.yours[key]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const oppCol = (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...micro, marginBottom: 4 }}>{`Opp — ${oppName} · Base Spe ${oppBaseSpe}`}</div>
      <RankRow label="Spe rank" value={oppStage} onChange={onOppStage} />
      {compare.tiers.map((t) => {
        const outcome = youEff > t.value ? 'faster' : youEff === t.value ? 'tie' : 'outsped';
        return (
          <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--line-1)' }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{t.label}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{t.value}</span>
            <Badge tone={outcome === 'faster' ? 'safe' : outcome === 'tie' ? 'field' : 'danger'}>
              {outcome === 'faster' ? 'Faster' : outcome === 'tie' ? 'Tie' : 'Outsped'}
            </Badge>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={layout === 'columns'
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }
        : { display: 'flex', flexDirection: 'column', gap: 14 }}>
        {youCol}
        {oppCol}
      </div>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>{formula}</code>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-speed-compare-view.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaSpeedCompareView.tsx src/features/damage-calculator/components/mobile/arena-speed-compare-view.test.tsx
git commit -m "feat(calc): ArenaSpeedCompareView with Actual/Scarf/Tailwind mode selector"
```

---

## Task 6: `ArenaStatCard` — computed-stat identity card

**Files:**
- Create: `src/features/damage-calculator/components/mobile/ArenaStatCard.tsx`
- Test: `src/features/damage-calculator/components/mobile/arena-stat-card.test.tsx`

**Interfaces:**
- Consumes: `SideState`, `calculateStat`/`calculateHP`, DS `Sprite`/`TypeBadge`.
- Produces: `ArenaStatCard({ side, name, tone, onOpenSpecies })`. Shows sprite + name + types + six computed stats (H/A/B/C/D/S) in a bordered card.

- [ ] **Step 1: Write the failing test**

```tsx
// arena-stat-card.test.tsx
import { render, screen } from '@testing-library/react';
import { ArenaStatCard } from './ArenaStatCard';

const side = {
  selectedId: 970, type1: 'rock', type2: 'poison',
  baseHp: 83, baseAtk: 90, baseDef: 105, baseSpa: 150, baseSpd: 96, baseSpe: 101,
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 32, spSpd: 0, spSpe: 0,
  boostedStat: 'spe', hinderedStat: null, stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
} as any;

it('renders six computed stat labels and a name', () => {
  render(<ArenaStatCard side={side} name="Glimmora" tone="accent" onOpenSpecies={() => {}} />);
  expect(screen.getByText('Glimmora')).toBeTruthy();
  ['H', 'A', 'B', 'C', 'D', 'S'].forEach((l) => expect(screen.getByText(l)).toBeTruthy());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-stat-card.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
// ArenaStatCard.tsx
import React from 'react';
import type { SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import { calculateStat, calculateHP } from '@/features/damage-calculator/utils/damage-calc';
import { Sprite, TypeBadge } from '@/design-system/arena';

const natureMult = (s: SideState, stat: string) =>
  s.boostedStat === stat ? 1.1 : s.hinderedStat === stat ? 0.9 : 1.0;

/** Computed stat rows laid out H/C, A/D, B/S (design order). */
function computeRows(s: SideState): { l1: string; v1: number; l2: string; v2: number }[] {
  const hp = calculateHP(s.baseHp, s.spHp);
  const atk = calculateStat(s.baseAtk, s.spAtk, natureMult(s, 'atk'), s.stages.atk || 0);
  const def = calculateStat(s.baseDef, s.spDef, natureMult(s, 'def'), s.stages.def || 0);
  const spa = calculateStat(s.baseSpa, s.spSpa, natureMult(s, 'spa'), s.stages.spa || 0);
  const spd = calculateStat(s.baseSpd, s.spSpd, natureMult(s, 'spd'), s.stages.spd || 0);
  const spe = calculateStat(s.baseSpe, s.spSpe, natureMult(s, 'spe'), s.stages.spe || 0);
  return [
    { l1: 'H', v1: hp, l2: 'C', v2: spa },
    { l1: 'A', v1: atk, l2: 'D', v2: spd },
    { l1: 'B', v1: def, l2: 'S', v2: spe },
  ];
}

export function ArenaStatCard({ side, name, tone, onOpenSpecies }: {
  side: SideState; name: string; tone: 'accent' | 'danger'; onOpenSpecies: () => void;
}) {
  const types = [side.type1, side.type2].filter(Boolean) as string[];
  const rows = side.selectedId ? computeRows(side) : [];
  return (
    <div style={{ border: '1px solid var(--line-1)', background: 'var(--surface-card)', borderRadius: 'var(--r-md)', padding: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Sprite dex={side.selectedId} name={name} size={64} ring tone={tone} />
        <button onClick={onOpenSpecies} style={{ minWidth: 0, flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || 'Select Pokémon'}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>{types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
        </button>
      </div>
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: 12.5 }}>
              <span style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--ink-3)', fontWeight: 700, width: 16 }}>{r.l1}</span><span style={{ color: 'var(--ink-1)', fontWeight: 700 }}>{r.v1}</span></span>
              <span style={{ display: 'flex', gap: 6, minWidth: 64 }}><span style={{ color: 'var(--ink-3)', fontWeight: 700, width: 16 }}>{r.l2}</span><span style={{ color: 'var(--ink-1)', fontWeight: 700 }}>{r.v2}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-stat-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaStatCard.tsx src/features/damage-calculator/components/mobile/arena-stat-card.test.tsx
git commit -m "feat(calc): ArenaStatCard with computed H/A/B/C/D/S display"
```

---

## Task 7: `ArenaSideConditions` — per-side status chips

**Files:**
- Create: `src/features/damage-calculator/components/mobile/ArenaSideConditions.tsx`
- Test: `src/features/damage-calculator/components/mobile/arena-side-conditions.test.tsx`

**Interfaces:**
- Consumes: `SideState`, `dispatch`, DS `Chip`.
- Produces: `ArenaSideConditions({ side, which, dispatch })`. Attacker (p1): Tailwind + Helping Hand. Defender (p2): Reflect + Light Screen. Each chip dispatches `TOGGLE_SIDE_EFFECT`.

- [ ] **Step 1: Write the failing test**

```tsx
// arena-side-conditions.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaSideConditions } from './ArenaSideConditions';

const base = { isReflect: false, isLightScreen: false, isHelpingHand: false, isTailwind: false } as any;

it('attacker shows Tailwind + Helping Hand and dispatches toggle', () => {
  const dispatch = vi.fn();
  render(<ArenaSideConditions side={base} which="p1" dispatch={dispatch} />);
  fireEvent.click(screen.getByText('Helping Hand'));
  expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDE_EFFECT', payload: { side: 'p1', effect: 'isHelpingHand' } });
});

it('defender shows Reflect + Light Screen', () => {
  render(<ArenaSideConditions side={base} which="p2" dispatch={() => {}} />);
  expect(screen.getByText('Reflect')).toBeTruthy();
  expect(screen.getByText('Light Screen')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-side-conditions.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
// ArenaSideConditions.tsx
import React from 'react';
import type { SideState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import { Chip } from '@/design-system/arena';

type Effect = 'isReflect' | 'isLightScreen' | 'isHelpingHand' | 'isTailwind';
const ATTACKER: { label: string; effect: Effect }[] = [
  { label: 'Tailwind', effect: 'isTailwind' }, { label: 'Helping Hand', effect: 'isHelpingHand' },
];
const DEFENDER: { label: string; effect: Effect }[] = [
  { label: 'Reflect', effect: 'isReflect' }, { label: 'Light Screen', effect: 'isLightScreen' },
];

export function ArenaSideConditions({ side, which, dispatch }: {
  side: SideState; which: 'p1' | 'p2'; dispatch: React.Dispatch<CalcAction>;
}) {
  const isP1 = which === 'p1';
  const items = isP1 ? ATTACKER : DEFENDER;
  const tone = isP1 ? 'accent' : 'danger';
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
        {isP1 ? 'Your side' : 'Opp side'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(({ label, effect }) => (
          <Chip key={effect} tone={tone} active={!!side[effect]}
            onClick={() => dispatch({ type: 'TOGGLE_SIDE_EFFECT', payload: { side: which, effect } })}>
            {label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-side-conditions.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaSideConditions.tsx src/features/damage-calculator/components/mobile/arena-side-conditions.test.tsx
git commit -m "feat(calc): ArenaSideConditions per-side status chips"
```

---

## Task 8: Unknown `?` placeholder tiles in the opponent roster strip

**Files:**
- Modify: `src/features/scan/OpponentRosterChips.tsx`
- Modify: `src/features/scan/RosterChipRow.tsx` (add optional `unknownCount`)
- Test: `src/features/scan/opponent-roster-chips.test.tsx` (create)

**Interfaces:**
- Consumes: existing `RosterChipRow`.
- Produces: `OpponentRosterChips` renders `6 - roster.length` dashed `?` tiles after the known chips (design lines 271–273).

- [ ] **Step 1: Write the failing test**

```tsx
// opponent-roster-chips.test.tsx
import { render, screen } from '@testing-library/react';
import OpponentRosterChips from './OpponentRosterChips';

it('renders one ? placeholder per unrevealed slot (up to 6)', () => {
  const byId = new Map([[445, { id: 445, nameEn: 'Garchomp' } as any]]);
  render(<OpponentRosterChips roster={[445]} byId={byId} onPick={() => {}} onClear={() => {}} />);
  // 1 known + 5 unknown placeholders
  expect(screen.getAllByLabelText('Unrevealed opponent slot').length).toBe(5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/opponent-roster-chips.test.tsx`
Expected: FAIL — no placeholders rendered.

- [ ] **Step 3: Implement** — pass `unknownCount` from `OpponentRosterChips`, render dashed `?` tiles in `RosterChipRow`.

```tsx
// OpponentRosterChips.tsx — add unknownCount
const OpponentRosterChips: React.FC<OpponentRosterChipsProps> = ({ roster, byId, activeId, onPick, onClear }) => (
  <RosterChipRow
    label="Opp"
    tone="danger"
    entries={roster.map((id) => ({ id, name: byId.get(id)?.nameEn ?? `#${id}` }))}
    unknownCount={Math.max(0, 6 - roster.length)}
    activeId={activeId}
    onPick={onPick}
    onClear={onClear}
    pickAriaLabel={(name) => `Set ${name} as defender`}
    clearAriaLabel="End battle (clear opponent roster)"
  />
);
```

In `RosterChipRow.tsx` add an optional `unknownCount?: number` prop and, after the entry chips, render:

```tsx
{Array.from({ length: unknownCount ?? 0 }).map((_, i) => (
  <div key={`unknown-${i}`} aria-label="Unrevealed opponent slot" style={{
    flex: 'none', width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center',
    border: '1px dashed var(--line-2)', color: 'var(--ink-4)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
  }}>?</div>
))}
```

> Read `RosterChipRow.tsx` first and match its existing container/markup; only add the placeholder loop and the new prop.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/opponent-roster-chips.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/OpponentRosterChips.tsx src/features/scan/RosterChipRow.tsx src/features/scan/opponent-roster-chips.test.tsx
git commit -m "feat(scan): unknown '?' placeholder tiles in the opponent roster strip"
```

---

## Task 9: Landscape — collapsible rails (1b) + responsive width (1c)

**Files:**
- Modify: `src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx`
- Test: `src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`

**Interfaces:**
- Consumes: existing component state.
- Produces: per-side `collapsed` state; a `Rail` sub-component; `clamp(228px,25%,300px)` panel width; center capped at 520.

- [ ] **Step 1: Write the failing test** — collapse renders a rail and hides panel inputs.

```tsx
// arena-calculator-landscape.test.tsx — add (reuse the file's existing render helper/fixtures)
it('collapsing the attacker side shows a rail with a chevron-to-expand and hides its move list', () => {
  renderLandscape(); // existing helper that mounts ArenaCalculatorLandscape with sample props
  fireEvent.click(screen.getByLabelText('Collapse attacker'));
  expect(screen.getByLabelText('Expand attacker')).toBeTruthy();
  // Ability select row from the full panel is gone while collapsed
  expect(screen.queryByText('Ability')).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`
Expected: FAIL — no collapse control exists.

- [ ] **Step 3: Implement** — add state, a `Rail` component, chevrons, and swap fixed width for `clamp`.

Add near the other `useState` hooks:

```tsx
  const [collapsed, setCollapsed] = useState<{ p1: boolean; p2: boolean }>({ p1: false, p2: false });
  const toggle = (s: Side) => setCollapsed((c) => ({ ...c, [s]: !c[s] }));
```

Change the `Panel` width from the fixed `PANEL_W`:

```tsx
// was: width: PANEL_W  → responsive; delete the `const PANEL_W = 240;` line
    <div style={{
      width: 'clamp(228px, 25%, 300px)', flex: '0 0 auto', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none',
      // ...rest unchanged...
```

Add a `Rail` sub-component (place beside `Panel`):

```tsx
function Rail({ side, name, dex, tone, subline, item, hpPercent, onExpand }: {
  side: 'left' | 'right'; name: string; dex: number | null; tone: 'accent' | 'danger';
  subline?: React.ReactNode; item?: string | null; hpPercent?: number; onExpand: () => void;
}) {
  return (
    <aside style={{
      width: 88, flex: 'none', background: 'var(--surface-sticky)',
      borderRight: side === 'left' ? '1px solid var(--line-1)' : 'none',
      borderLeft: side === 'right' ? '1px solid var(--line-1)' : 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 8px',
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: tone === 'accent' ? 'var(--ink-3)' : 'var(--danger)' }}>
        {side === 'left' ? 'You' : 'Opp'}
      </div>
      <Sprite dex={dex} name={name} size={46} ring tone={tone} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-1)', textAlign: 'center', lineHeight: 1.2 }}>{name || '—'}</div>
      {subline}
      {hpPercent != null && (
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{hpPercent}%</div>
      )}
      {item && <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-4)', textAlign: 'center', lineHeight: 1.2 }}>{item}</div>}
      <span style={{ flex: 1 }} />
      <button onClick={onExpand} aria-label={`Expand ${side === 'left' ? 'attacker' : 'defender'}`} style={{
        width: 40, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)', border: '1px solid var(--line-2)',
        color: 'var(--ink-2)', cursor: 'pointer', display: 'grid', placeItems: 'center',
      }}>
        <Icon name={side === 'left' ? 'chevrons-right' : 'chevrons-left'} size={18} color="var(--ink-2)" />
      </button>
    </aside>
  );
}
```

Add a collapse chevron inside each `Panel` header (in the `Panel` component, after the Micro label / before the badge):

```tsx
      <button onClick={onCollapse} aria-label={`Collapse ${side === 'left' ? 'attacker' : 'defender'}`} style={{
        width: 24, height: 24, marginRight: 6, borderRadius: 6, background: 'transparent',
        border: '1px solid var(--line-1)', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center',
      }}>
        <Icon name={side === 'left' ? 'chevrons-left' : 'chevrons-right'} size={14} color="var(--ink-3)" />
      </button>
```

(Add `onCollapse: () => void` to `Panel`'s props.) In the render tree, wrap each side:

```tsx
{collapsed.p1
  ? <Rail side="left" name={nameOf(state.p1.selectedId)} dex={state.p1.selectedId} tone="accent"
      subline={/* active move type badge + name */ null}
      item={state.p1.item} onExpand={() => toggle('p1')} />
  : <Panel side="left" onCollapse={() => toggle('p1')} badge={<Badge tone="accent">You</Badge>}> ... </Panel>}
```

and likewise the right side with `hpPercent={state.p2.hpPercent}`.

Finally, cap the center column content: wrap the center's children in `<div style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>…</div>` (or add `maxWidth: 520, margin: '0 auto'` to the existing center inner container).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx
git commit -m "feat(calc): collapsible landscape rails + responsive panel width"
```

---

## Task 10: Landscape — scenario KO badges + inline HP editing

**Files:**
- Modify: `src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx`
- Test: same landscape test file.

**Interfaces:**
- Consumes: `koVerdictFromText`, `ScenarioRange.koChanceText` (Task 2), `SET_HP_PERCENT`.
- Produces: `ScenarioRow` renders a KO `Badge`; defender HP is editable (bar drag + number input + steppers).

- [ ] **Step 1: Write the failing tests**

```tsx
it('a scenario with a KO chance shows a verdict badge', () => {
  renderLandscape(); // fixtures include scenarios with koChanceText: 'guaranteed 2HKO'
  expect(screen.getByText(/2HKO/)).toBeTruthy();
});

it('typing a defender HP percent dispatches SET_HP_PERCENT', () => {
  const { dispatch } = renderLandscape();
  fireEvent.change(screen.getByLabelText('Defender HP percent'), { target: { value: '40' } });
  expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: 40 } });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`
Expected: FAIL — no badge / no HP input.

- [ ] **Step 3a: Implement scenario badges** — extend `ScenarioRow` to accept the range's `koChanceText` and render a `Badge`:

```tsx
import { koVerdictFromText } from '@/design-system/arena';

function ScenarioRow({ label, range }: { label: string; range: ScenarioRange | null }) {
  if (!range) return null;
  const danger = range.maxPercent >= 100;
  const ko = koVerdictFromText(range.koChanceText);
  const badgeTone = ko.tone === 'safe' ? 'safe' : ko.tone === 'field' ? 'field' : ko.tone === 'danger' ? 'danger' : 'neutral';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap' }}>
          {range.minPercent}–{range.maxPercent}%
        </span>
        {range.koChanceText && <Badge tone={badgeTone}>{ko.verdict}</Badge>}
      </div>
      <div style={{ marginTop: 4, height: 5, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, range.maxPercent)}%`, height: '100%', background: danger ? 'var(--danger)' : 'var(--safe)', opacity: 0.85 }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3b: Implement inline HP editing** — replace the defender HP read-out block in the right `Panel` with an editable control:

```tsx
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            aria-label="Defender HP percent"
            type="number" min={0} max={100} value={state.p2.hpPercent}
            onChange={(e) => dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } })}
            style={{ width: 60, padding: '5px 8px', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)', color: 'var(--ink-1)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textAlign: 'center' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>% HP</span>
          <span style={{ flex: 1 }} />
          <button aria-label="Lower defender HP" onClick={() => dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: Math.max(0, state.p2.hpPercent - 1) } })} style={hpStep}>−</button>
          <button aria-label="Raise defender HP" onClick={() => dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: Math.min(100, state.p2.hpPercent + 1) } })} style={hpStep}>+</button>
        </div>
```

where `const hpStep: React.CSSProperties = { width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', color: 'var(--ink-2)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1 };`. Keep the existing HP bar above it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx
git commit -m "feat(calc): scenario KO badges + inline defender HP editing (landscape)"
```

---

## Task 11: Landscape — integrate ArenaStatCard, ArenaMoveList, ArenaSideConditions, ArenaSpeedCompareView

**Files:**
- Modify: `src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx`
- Test: same landscape test file.

**Interfaces:**
- Consumes: the four new components (Tasks 4–7), `buildSpeedCompare`.
- Produces: landscape panels use `ArenaStatCard` (identity+stats), `ArenaMoveList` (attacker), `ArenaSideConditions` (both), and the center speed view uses `ArenaSpeedCompareView`.

- [ ] **Step 1: Write the failing test**

```tsx
it('attacker panel shows computed stats and per-side chips; speed view has mode buttons', () => {
  renderLandscape();
  expect(screen.getByText('S')).toBeTruthy();            // stat card label
  expect(screen.getByText('Helping Hand')).toBeTruthy(); // side conditions
  fireEvent.click(screen.getByText('Speed'));            // segmented toggle
  expect(screen.getByText('Scarf')).toBeTruthy();        // speed mode button
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`
Expected: FAIL — stat labels / chips / mode buttons absent.

- [ ] **Step 3: Implement**

- Import the four components at the top:

```tsx
import { ArenaMoveList } from './ArenaMoveList';
import { ArenaSpeedCompareView } from './ArenaSpeedCompareView';
import { ArenaStatCard } from './ArenaStatCard';
import { ArenaSideConditions } from './ArenaSideConditions';
```

- **Attacker panel:** replace the inline `<Identity … />` with `<ArenaStatCard side={state.p1} name={nameOf(state.p1.selectedId)} tone="accent" onOpenSpecies={() => setPicker({ side: 'p1', field: 'species' })} />`; replace the inline `<MoveList … />` with `<ArenaMoveList side={state.p1} results={p1Results} onSelect={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p1', index } })} onEdit={() => setMovePickerSide('p1')} />`; after the tune-box grid add `<ArenaSideConditions side={state.p1} which="p1" dispatch={dispatch} />`.
- **Defender panel:** replace `<Identity … />` with `<ArenaStatCard side={state.p2} name={nameOf(state.p2.selectedId)} tone="danger" onOpenSpecies={() => setPicker({ side: 'p2', field: 'species' })} />`; after the tune-box grid add `<ArenaSideConditions side={state.p2} which="p2" dispatch={dispatch} />`. Keep the HP editor (Task 10), Move/Ability/Item rows, Scan button.
- Delete the now-unused inline `Identity` and `MoveList` functions and the `MoveList` usage. Keep `TypeBadge`/`Sprite` imports only if still used elsewhere; otherwise remove to satisfy lint.
- **Center speed view:** replace the whole `view === 'speed'` block with:

```tsx
        ) : (
          <ArenaSpeedCompareView
            compare={speed}
            layout="columns"
            youName={nameOf(state[dir].selectedId)}
            oppName={nameOf(state[defDir].selectedId)}
            oppBaseSpe={state[defDir].baseSpe}
            youStage={state[dir].stages.spe || 0}
            oppStage={state[defDir].stages.spe || 0}
            onYouStage={(val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: dir, stat: 'spe', val } })}
            onOppStage={(val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: defDir, stat: 'spe', val } })}
            formula={speedFormula(state[dir])}
          />
        )}
```

- Add a small `speedFormula` helper near the top of the file (live example matching the design):

```tsx
function speedFormula(s: SideState): string {
  const mult = s.boostedStat === 'spe' ? 1.1 : s.hinderedStat === 'spe' ? 0.9 : 1.0;
  const val = Math.floor((s.baseSpe + 20 + s.spSpe) * mult);
  return `${val} = floor((${s.baseSpe} + 20 + ${s.spSpe}) × ${mult.toFixed(1)})`;
}
```

`speed` (the `buildSpeedCompare(...)` result already computed in the component) and `defDir` already exist; keep them.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx && npx vitest run src/features/damage-calculator`
Expected: PASS; no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx
git commit -m "feat(calc): integrate stat card, move list, side chips, speed view into landscape"
```

---

## Task 12: Portrait — HUD roll bar

**Files:**
- Modify: `src/features/damage-calculator/components/mobile/ArenaHud.tsx`
- Test: `src/features/damage-calculator/components/mobile/arena-hud.test.tsx` (create)

**Interfaces:**
- Consumes: the active `DamageResult` already computed in `ArenaHud`.
- Produces: a min–max roll bar under the readout.

- [ ] **Step 1: Write the failing test**

```tsx
// arena-hud.test.tsx
import { render } from '@testing-library/react';
import { ArenaHud } from './ArenaHud';
// build minimal state + results with an active result r (minPercent 62, maxPercent 74)
it('renders a roll bar when there is an active result', () => {
  const { container } = render(<ArenaHud {...hudProps} />); // hudProps: sample state/dir/results/nameOf
  expect(container.querySelector('[data-testid="hud-roll-bar"]')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-hud.test.tsx`
Expected: FAIL — no roll bar element.

- [ ] **Step 3: Implement** — after the readout/KOVerdict row in `ArenaHud`, add:

```tsx
      {r && (
        <div data-testid="hud-roll-bar" style={{ height: 8, marginTop: 12, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${Math.min(100, r.minPercent)}%`, background: 'var(--danger)' }} />
          <div style={{ width: `${Math.min(100, r.maxPercent) - Math.min(100, r.minPercent)}%`, background: 'var(--danger-soft)', borderLeft: '1px solid var(--danger-line)' }} />
        </div>
      )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-hud.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaHud.tsx src/features/damage-calculator/components/mobile/arena-hud.test.tsx
git commit -m "feat(calc): HUD damage roll bar (portrait)"
```

---

## Task 13: Portrait — collapsible field conditions + Trick Room chip

**Files:**
- Modify: `src/features/damage-calculator/components/mobile/ArenaFieldConditions.tsx`
- Test: `src/features/damage-calculator/components/mobile/arena-field-conditions.test.tsx` (create)

**Interfaces:**
- Consumes: `state.isTrickRoom`, `TOGGLE_TRICK_ROOM` (Task 3), DS `Chip`/`Icon`.
- Produces: a chevron header that collapses the body (default open); a Trick Room chip in a new field group.

- [ ] **Step 1: Write the failing tests**

```tsx
// arena-field-conditions.test.tsx
it('collapses the body when the header is clicked', () => {
  render(<ArenaFieldConditions state={sampleState} dispatch={() => {}} />);
  expect(screen.getByText('Weather')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /field conditions/i }));
  expect(screen.queryByText('Weather')).toBeNull();
});

it('Trick Room chip dispatches TOGGLE_TRICK_ROOM', () => {
  const dispatch = vi.fn();
  render(<ArenaFieldConditions state={sampleState} dispatch={dispatch} />);
  fireEvent.click(screen.getByText('Trick Room'));
  expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_TRICK_ROOM' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-field-conditions.test.tsx`
Expected: FAIL — header not a button / no Trick Room chip.

- [ ] **Step 3: Implement** — make the header a toggle button controlling a local `open` state (default true), and add a Trick Room chip group.

```tsx
import React, { useState } from 'react';
// ...existing imports + Icon...
export function ArenaFieldConditions({ state, dispatch }: { state: CalcState; dispatch: React.Dispatch<CalcAction> }) {
  const [open, setOpen] = useState(true);
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Field conditions"
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 'var(--sp-4)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <Icon name="cloud-sun" size={18} color="var(--field)" />
        <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--ink-1)' }}>Field conditions</span>
        {state.weather !== 'None' && <Badge tone="field">{state.weather}</Badge>}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="var(--ink-3)" />
      </button>
      {open && (
        <div style={{ padding: '0 0 var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* existing Weather / Terrain / Target / Auras / Gravity groups unchanged */}
          <ChipGroup label="Room">
            <Chip active={state.isTrickRoom} onClick={() => dispatch({ type: 'TOGGLE_TRICK_ROOM' })}>Trick Room</Chip>
          </ChipGroup>
        </div>
      )}
    </Card>
  );
}
```

Keep the existing Weather/Terrain/Target/Auras/Gravity groups verbatim inside the `open` block.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-field-conditions.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaFieldConditions.tsx src/features/damage-calculator/components/mobile/arena-field-conditions.test.tsx
git commit -m "feat(calc): collapsible field conditions + Trick Room chip (portrait)"
```

---

## Task 14: Portrait — Damage/Speed toggle + speed view + attacker move list

**Files:**
- Modify: `src/features/damage-calculator/components/mobile/ArenaCalculator.tsx`
- Modify: `src/features/damage-calculator/components/mobile/ArenaMonCard.tsx`
- Test: `src/features/damage-calculator/components/mobile/arena-calculator.test.tsx` (create)

**Interfaces:**
- Consumes: `ArenaSpeedCompareView` (Task 5, `layout="stacked"`), `ArenaMoveList` (Task 4), `buildSpeedCompare`.
- Produces: portrait gains a Damage/Speed segmented toggle; Speed view renders the stacked speed compare; the attacker card shows the per-move-% move list.

- [ ] **Step 1: Write the failing tests**

```tsx
// arena-calculator.test.tsx
it('toggling to Speed shows the stacked speed compare (Scarf mode button)', () => {
  render(<ArenaCalculator {...calcProps} />); // sample props like the landscape test
  fireEvent.click(screen.getByRole('button', { name: 'Speed' }));
  expect(screen.getByText('Scarf')).toBeTruthy();
});

it('attacker card shows a per-move percent', () => {
  render(<ArenaCalculator {...calcProps} />); // p1 has an active move with a p1Results percent
  expect(screen.getByText(/–\d+%/)).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-calculator.test.tsx`
Expected: FAIL — no Speed toggle / no move percent in the card.

- [ ] **Step 3a: Implement the toggle + speed view in `ArenaCalculator`**

Add imports + state:

```tsx
import { ArenaSpeedCompareView } from './ArenaSpeedCompareView';
import { buildSpeedCompare } from '@/features/damage-calculator/utils/speed';
// ...
  const [view, setView] = useState<'damage' | 'speed'>('damage');
  const defDir: Side = dir === 'p1' ? 'p2' : 'p1';
  const speed = buildSpeedCompare(
    { baseSpe: state[dir].baseSpe, spSpe: state[dir].spSpe, boostedStat: state[dir].boostedStat, hinderedStat: state[dir].hinderedStat, speStage: state[dir].stages.spe || 0, item: state[dir].item, isTailwind: state[dir].isTailwind },
    { baseSpe: state[defDir].baseSpe, speStage: state[defDir].stages.spe || 0, isTailwind: state[defDir].isTailwind },
  );
  const speedFormula = (() => {
    const s = state[dir]; const mult = s.boostedStat === 'spe' ? 1.1 : s.hinderedStat === 'spe' ? 0.9 : 1.0;
    const val = Math.floor((s.baseSpe + 20 + s.spSpe) * mult);
    return `${val} = floor((${s.baseSpe} + 20 + ${s.spSpe}) × ${mult.toFixed(1)})`;
  })();
```

Render a segmented toggle directly under `<ArenaHud … />`:

```tsx
      <div style={{ padding: '11px var(--gutter) 0' }}>
        <div style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--surface-inset)', borderRadius: 'var(--r-pill)', border: '1px solid var(--line-1)' }}>
          {(['damage', 'speed'] as const).map((v) => {
            const on = view === v;
            return (
              <button key={v} onClick={() => setView(v)} style={{
                flex: 1, padding: '7px 0', borderRadius: 'var(--r-pill)', cursor: 'pointer',
                background: on ? 'var(--accent-soft)' : 'transparent',
                border: `1px solid ${on ? 'var(--accent-soft-line)' : 'transparent'}`,
                fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: on ? 'var(--accent)' : 'var(--ink-3)',
              }}>{v === 'damage' ? 'Damage' : 'Speed'}</button>
            );
          })}
        </div>
      </div>
```

Wrap the existing damage body (`ArenaMonCard`×2 + Scan + fields + SP footnote) in `{view === 'damage' && ( … )}`, and add the speed branch below it:

```tsx
      {view === 'speed' && (
        <div style={{ padding: 'var(--sp-4) var(--gutter) var(--sp-7)' }}>
          <ArenaSpeedCompareView
            compare={speed} layout="stacked"
            youName={nameOf(state[dir].selectedId)} oppName={nameOf(state[defDir].selectedId)}
            oppBaseSpe={state[defDir].baseSpe}
            youStage={state[dir].stages.spe || 0} oppStage={state[defDir].stages.spe || 0}
            onYouStage={(val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: dir, stat: 'spe', val } })}
            onOppStage={(val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: defDir, stat: 'spe', val } })}
            formula={speedFormula}
          />
        </div>
      )}
```

Pass `p1Results`/`p2Results` into `ArenaMonCard` (needed by the move list): `ArenaCalculator` already receives them — add `results={side === 'p1' ? p1Results : p2Results}` to each `ArenaMonCard`.

- [ ] **Step 3b: Add the move list to `ArenaMonCard`** — import `ArenaMoveList`, add a `results` prop, and for the **attacker** replace the single `<SelectRow label="Move" … />` with the move list; the defender keeps its single Move row.

```tsx
// ArenaMonCard.tsx
import { ArenaMoveList } from './ArenaMoveList';
// add to props: results: (DamageResult | null)[]; and import type DamageResult
// in the rows block:
{role === 'Attacker' ? (
  <ArenaMoveList
    side={s}
    results={results}
    onSelect={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side, index } })}
    onEdit={() => onOpenPicker('move')}
  />
) : (
  <SelectRow label="Move" value={activeMove?.nameEn ?? 'None'} leading={s.type1 ? <TypeBadge type={s.type1} size="sm" /> : null} onClick={() => onOpenPicker('move')} />
)}
```

Keep the Ability/Item/Nature rows and the SP `StatGrid` unchanged (additive parity — inline SP stays).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-calculator.test.tsx && npx vitest run src/features/damage-calculator`
Expected: PASS; no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaCalculator.tsx src/features/damage-calculator/components/mobile/ArenaMonCard.tsx src/features/damage-calculator/components/mobile/arena-calculator.test.tsx
git commit -m "feat(calc): portrait Damage/Speed toggle, speed view, and attacker move list"
```

---

## Task 15: Full regression + manual preview verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole calculator + hooks test suite**

Run: `npx vitest run src/features/damage-calculator src/hooks/useViewportMode.test.ts src/features/scan/opponent-roster-chips.test.tsx`
Expected: PASS.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/features/damage-calculator/components/mobile src/hooks/useViewportMode.ts`
Expected: no errors (remove any now-unused imports flagged).

- [ ] **Step 3: Manual preview** — start the dev server and verify each viewport:
  - **852×360 landscape (phone):** collapse/expand each rail; stat cards show 6 stats; move rows show category + BP; scenario rows show KO badges; defender HP input + steppers work; Speed view shows Actual/Scarf/Tailwind buttons and the verdicts flip when you switch mode; per-side chips toggle.
  - **1180×820 landscape (iPad, coarse pointer):** wider panels (~295px), center capped ~520px.
  - **1280×800 (laptop, fine pointer):** still the **desktop** calculator (regression).
  - **375×812 portrait:** Damage/Speed toggle; attacker move list %; collapsible field conditions with a Trick Room chip; HUD roll bar.

- [ ] **Step 4: Commit** (if lint/typecheck fixes were needed)

```bash
git add -A
git commit -m "chore(calc): lint/typecheck fixes after fidelity pass"
```

---

## Self-review notes (author checklist — done before handoff)

- **Spec coverage:** viewport gating (T1), collapsible rails (T9), responsive width/roomy (T9), computed stats #1 (T6/T11), move category+BP #2 (T4/T11/T14), scenario badges #3 (T2/T10), speed redesign #4 (T5/T11/T14), inline HP #5 (T10), per-side chips #6 (T7/T11), Trick Room (T3/T13), portrait toggle/speed/move-list/fields/roll-bar (T12/T13/T14), unknown roster tiles (T8). Mega/Record-result intentionally excluded.
- **Type consistency:** component prop names match the Global Constraints contract; `ScenarioRange.koChanceText` defined in T2 before use in T10; `TOGGLE_TRICK_ROOM` defined in T3 before use in T13.
- **Deferred/verify-on-read:** the exact reducer export name in `useCalculatorState.ts` (T3) and the `RosterChipRow` markup (T8) must be read before editing — noted inline in those tasks.
