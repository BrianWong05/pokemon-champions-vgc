# Roster Chips in Defender Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the floating battle-roster strip with a compact chip row rendered inside the Defender panel on both layouts; tap = set as defender.

**Architecture:** New `OpponentRosterChips` (tap→`onPick`, active-chip ring, ✕ clear) replaces `OpponentRosterStrip` (deleted). The calculator page composes it once and passes it down as a roster-agnostic `defenderExtra?: React.ReactNode` slot: mobile `ArenaCalculator` → `ArenaMonCard` (rendered under the card header); desktop `DefenderPanel` (rendered above its `PokemonPanel`). Spec: `docs/superpowers/specs/2026-07-07-roster-chips-in-defender-design.md`.

**Tech Stack:** React 18 + TypeScript, Tailwind classes (matches the existing strip), no new dependencies.

## Global Constraints

- Purely presentational: NO changes to roster storage, masks, scan modal, confirm flow, or Clear semantics.
- Tap = set as defender only (no popover, no attacker action on chips).
- Templates stay roster-agnostic — they receive a `React.ReactNode`, never roster types.
- No roster → the slot is `null` and nothing renders in either layout.
- `OpponentRosterStrip.tsx` is DELETED (no dead code left behind).
- No component-test infra (established project decision): verification is `npx tsc --noEmit` + full `npm test` + the Task 2 browser checklist.
- Branch: `feat/roster-chips-in-panel`. Commit by exact file path.

---

### Task 1: Component swap + slot threading + page wiring

**Files:**
- Create: `src/features/scan/OpponentRosterChips.tsx`
- Delete: `src/features/scan/OpponentRosterStrip.tsx`
- Modify: `src/features/damage-calculator/components/mobile/ArenaMonCard.tsx:16-44` (add `extra` prop, render after header)
- Modify: `src/features/damage-calculator/components/mobile/ArenaCalculator.tsx:31-46,73` (thread `defenderExtra`)
- Modify: `src/features/damage-calculator/components/DefenderPanel.tsx:9-23` (add `defenderExtra`, wrap render)
- Modify: `src/pages/DamageCalculator/index.tsx:28,62-63,294-305,376-387` (compose chips, remove strip)

**Interfaces:**
- Consumes: existing `useBattleRoster` state on the page (`battleRoster`, `clearRoster`), `pokemonById: Map<number, PokemonBaseStats>`, `handleLoadDefender(id)`, `state.p2.selectedId`.
- Produces: `OpponentRosterChips` default export with props `{ roster: number[]; byId: Map<number, PokemonBaseStats>; activeId?: number | null; onPick: (id: number) => void; onClear: () => void }`; `defenderExtra?: React.ReactNode` on `ArenaCalculator` and `DefenderPanel`; `extra?: React.ReactNode` on `ArenaMonCard`.

- [ ] **Step 1: Create the chips component**

```tsx
// src/features/scan/OpponentRosterChips.tsx
// Compact battle-roster chip row rendered inside the Defender panel: the
// opponent's confirmed six, one tap -> load as defender, ✕ ends the session.
import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface OpponentRosterChipsProps {
  roster: number[];
  byId: Map<number, PokemonBaseStats>;
  /** Current defender species id — its chip gets the selected ring. */
  activeId?: number | null;
  onPick: (id: number) => void;
  onClear: () => void;
}

const OpponentRosterChips: React.FC<OpponentRosterChipsProps> = ({ roster, byId, activeId, onPick, onClear }) => (
  <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-lg border border-line-2 bg-inset p-1">
    <span className="px-1 text-[10px] font-semibold text-danger">Opp</span>
    {roster.map((id) => (
      <button
        key={id}
        type="button"
        onClick={() => onPick(id)}
        className={`shrink-0 rounded-lg border p-0.5 ${activeId === id ? 'border-transparent bg-accent-soft ring-2 ring-accent' : 'border-line bg-card'}`}
        title={byId.get(id)?.nameEn ?? `#${id}`}
        aria-label={`Set ${byId.get(id)?.nameEn ?? `#${id}`} as defender`}
      >
        <PokemonImage id={id} name={byId.get(id)?.nameEn ?? 'pokemon'} className="w-8 h-8" />
      </button>
    ))}
    <button
      type="button"
      className="ml-auto shrink-0 px-1.5 py-0.5 text-danger hover:bg-danger-soft rounded"
      onClick={onClear}
      aria-label="End battle (clear opponent roster)"
      title="End battle"
    >
      ✕
    </button>
  </div>
);

export default OpponentRosterChips;
```

- [ ] **Step 2: Add the `extra` slot to `ArenaMonCard`**

In `src/features/damage-calculator/components/mobile/ArenaMonCard.tsx`: add `extra` to the props destructuring and type (after `onOpenAdvanced`):

```tsx
export function ArenaMonCard({ side, role, state, dispatch, nameOf, onOpenPicker, onOpenAdvanced, extra }: {
  side: 'p1' | 'p2';
  role: 'Attacker' | 'Defender';
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  nameOf: (id: number | null) => string;
  onOpenPicker: (field: 'species' | 'move' | 'ability' | 'item' | 'nature') => void;
  onOpenAdvanced: () => void;
  /** Optional slot rendered directly under the card header (e.g. the battle-roster chips). */
  extra?: React.ReactNode;
}) {
```

Render it immediately after the closing `/>` of `<CardHeader …/>` (currently line 44), before the `{role === 'Defender' && (` HP block:

```tsx
      {extra}
```

- [ ] **Step 3: Thread `defenderExtra` through `ArenaCalculator`**

In `src/features/damage-calculator/components/mobile/ArenaCalculator.tsx`: add `defenderExtra` to the destructuring and prop type (after `onOpenScan`):

```tsx
  onOpenScan: () => void;
  /** Optional slot rendered under the Defender card's header (battle-roster chips). */
  defenderExtra?: React.ReactNode;
```

(and `defenderExtra,` in the destructuring list on the line above the type block). Then on the Defender card render (line 73), add the prop:

```tsx
        <ArenaMonCard side="p2" role="Defender" state={state} dispatch={dispatch} nameOf={nameOf} onOpenPicker={openPicker('p2')} onOpenAdvanced={() => setAdvancedSide('p2')} extra={defenderExtra} />
```

(The p1/Attacker card gets no `extra`.)

- [ ] **Step 4: Add `defenderExtra` to `DefenderPanel`**

In `src/features/damage-calculator/components/DefenderPanel.tsx`: add to the `Props` interface:

```tsx
  /** Optional slot rendered above the panel (battle-roster chips). */
  defenderExtra?: React.ReactNode;
```

destructure it in the component signature, and wrap the return so the chips sit above the panel:

```tsx
  return (
    <div>
      {defenderExtra}
      <PokemonPanel
        …existing props unchanged…
      />
    </div>
  );
```

(Only add the wrapper `<div>` and `{defenderExtra}`; every `PokemonPanel` prop stays byte-identical.)

- [ ] **Step 5: Rewire the page**

In `src/pages/DamageCalculator/index.tsx`:
1. Replace the import (line 28): `import OpponentRosterStrip from '@/features/scan/OpponentRosterStrip';` → `import OpponentRosterChips from '@/features/scan/OpponentRosterChips';`
2. After the `pokemonById` memo (line 63), compose the slot once:

```tsx
  const rosterChips = battleRoster && battleRoster.length > 0 ? (
    <OpponentRosterChips
      roster={battleRoster}
      byId={pokemonById}
      activeId={state.p2.selectedId}
      onPick={(id) => void handleLoadDefender(id)}
      onClear={clearRoster}
    />
  ) : null;
```

(Place it AFTER `handleLoadDefender`'s declaration — it references the function; anywhere after line ~123 and before the returns works.)
3. Mobile branch: add `defenderExtra={rosterChips}` to the `<ArenaCalculator …/>` props, and DELETE the entire `{battleRoster && battleRoster.length > 0 && (<OpponentRosterStrip …/>)}` block (lines ~297-305).
4. Desktop branch: add `defenderExtra={rosterChips}` to the `<DefenderPanel …/>` render (line ~357), and DELETE the second `<OpponentRosterStrip …/>` block (lines ~379-387).

- [ ] **Step 6: Delete the old component**

```bash
git rm src/features/scan/OpponentRosterStrip.tsx
```

Then confirm no references remain: `grep -rn "OpponentRosterStrip" src/` — Expected: no output.

- [ ] **Step 7: Verify types and suite**

Run: `npx tsc --noEmit` — Expected: clean.
Run: `npm test` — Expected: all pass (284; no logic touched).

- [ ] **Step 8: Commit**

```bash
git add src/features/scan/OpponentRosterChips.tsx src/features/damage-calculator/components/mobile/ArenaMonCard.tsx src/features/damage-calculator/components/mobile/ArenaCalculator.tsx src/features/damage-calculator/components/DefenderPanel.tsx src/pages/DamageCalculator/index.tsx
git commit -m "feat: battle-roster chips live in the Defender panel (tap = set defender)"
```

(`git rm` already staged the deletion.)

---

### Task 2: Browser verification (both layouts)

**Files:** none — verification only.

- [ ] **Step 1: Dev server + roster setup**

`npm run dev`, open the Calculator. Seed a roster: either scan a team-preview screenshot and Confirm, or in DevTools `localStorage.setItem('scan.battleRoster', '[6,142,445,983,784,479]')` and reload.

- [ ] **Step 2: Mobile layout (~375px viewport)**

1. Chip row renders INSIDE the Defender card, under its header — no overlap with the Move row (the old floating-strip defect).
2. Tap a chip → that Pokémon loads as defender at 100% HP; its chip now shows the selected ring.
3. ✕ at the row's end clears the roster; the row disappears; `localStorage.getItem('scan.battleRoster')` is null.
4. With no roster: no chip row anywhere; Attacker card unaffected.

- [ ] **Step 3: Desktop layout (≥1280px)**

Same four checks; the chip row sits above the Defender panel. Confirm the Attacker column has no chip row.

- [ ] **Step 4: Hand off**

`git status --short` clean → superpowers:finishing-a-development-branch.
