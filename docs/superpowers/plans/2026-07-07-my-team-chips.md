# My-Team Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Select one of your saved Teams once → its members appear as chips in the Attacker panel (tap loads the member's full saved build), and battle scans mask player-side recognition to that team's form families.

**Architecture:** A string-keyed localStorage store (`myTeam.ts`) + a pure `buildLegalIdsResolver` helper (testable mask policy, replacing the modal's inline resolver); a shared `RosterChipRow` presentational component extracted from `OpponentRosterChips`; `MyTeamChips` (team `<select>` → chip row); `useMyTeam` page hook joining the stored id against `useTeams()`; slot threading mirroring PR #22 (`attackerExtra` on `ArenaCalculator`→p1 `ArenaMonCard.extra` and on desktop `AttackerPanel`). Spec: `docs/superpowers/specs/2026-07-07-my-team-chips-design.md`.

**Tech Stack:** React 18 + TypeScript, Vitest (jsdom for storage tests, per `battleRoster.test.ts`), Tailwind classes, no new dependencies.

## Global Constraints

- **`Team.id` is a `string`** (`src/db/repositories/team.repo.ts:7`) — the store, hook, and `<select>` values all use string ids. localStorage key is exactly `calc.myTeamId`.
- Tap = `actions.handleLoadConfig('p1', member.configuration)` — the FULL saved build; its missing-species guard already no-ops format-illegal members. Never pass species-only.
- Mask policy: battle-mode PLAYER tiles → my-team form-family set; battle-mode opponent tiles → opponent roster family (unchanged); team-preview and descriptor-legacy paths → full format set. **With both masks absent, the modal must pass the SAME plain `Set` object as today** (plain-Set parity; scanFrame's refs cache keys on Set identity).
- `OpponentRosterChips` refactor is behavior-preserving: same DOM, classes, and aria-labels (it becomes a thin wrapper over `RosterChipRow`).
- Members derive LIVE from `useTeams()`; a stored id with no matching team behaves as no selection (picker shows). No saved teams → disabled "No teams yet" option.
- No component-test infra (established): UI verified by tsc + suite + the Task 4 browser checklist. Pure logic (store, resolver) is unit-tested.
- No new npm dependencies. Branch `feat/my-team-chips`. Commit by exact file path. Focused tests `npx vitest run <path>`; suite `npm test`; types `npx tsc --noEmit`.

---

### Task 1: `myTeam` store + `buildLegalIdsResolver` (pure logic, TDD)

**Files:**
- Create: `src/features/scan/myTeam.ts`
- Modify: `src/features/scan/battleRoster.ts` (append `buildLegalIdsResolver`)
- Test: `src/features/scan/myTeam.test.ts`, `src/features/scan/battleRoster.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `LegalIdsBySide` from `./scanFrame`; `ScanSide` from `./types`; `ScanMode` from `./scanTargets`.
- Produces: `readMyTeamId(): string | null`, `saveMyTeamId(id: string): void`, `clearMyTeamId(): void` from `myTeam.ts`; `buildLegalIdsResolver(full: Set<number>, oppFamily: Set<number> | null, myFamily: Set<number> | null): LegalIdsBySide` from `battleRoster.ts` — Tasks 2–3 rely on these exact names.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/scan/myTeam.test.ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readMyTeamId, saveMyTeamId, clearMyTeamId } from './myTeam';

describe('my-team store', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a team id and clears it', () => {
    saveMyTeamId('team-abc-123');
    expect(readMyTeamId()).toBe('team-abc-123');
    clearMyTeamId();
    expect(readMyTeamId()).toBeNull();
  });

  it('rejects empty saves and treats non-string storage as no selection', () => {
    saveMyTeamId('');
    expect(readMyTeamId()).toBeNull();
    localStorage.setItem('calc.myTeamId', '  ');
    expect(readMyTeamId()).toBeNull();
  });
});
```

Append to `src/features/scan/battleRoster.test.ts` (uses the file's existing jsdom setup; add `buildLegalIdsResolver` to the import from `./battleRoster`):

```typescript
describe('buildLegalIdsResolver', () => {
  const full = new Set([1, 2, 3]);
  const opp = new Set([6, 10034]);
  const mine = new Set([479, 10008]);

  it('both masks absent -> returns the SAME plain Set (identity parity)', () => {
    expect(buildLegalIdsResolver(full, null, null)).toBe(full);
  });

  it('battle mode: player tiles get my-team family, opponent tiles get roster family', () => {
    const r = buildLegalIdsResolver(full, opp, mine);
    expect(typeof r).toBe('function');
    const fn = r as (side: string | undefined, mode: string | null) => Set<number>;
    expect(fn('player', 'battle')).toBe(mine);
    expect(fn('opponent', 'battle')).toBe(opp);
  });

  it('team-preview and legacy paths always get the full set', () => {
    const fn = buildLegalIdsResolver(full, opp, mine) as (s: string | undefined, m: string | null) => Set<number>;
    expect(fn('opponent', 'team')).toBe(full);
    expect(fn('player', 'team')).toBe(full);
    expect(fn(undefined, null)).toBe(full);
  });

  it('one-sided masks fall back to full on the unmasked side', () => {
    const onlyOpp = buildLegalIdsResolver(full, opp, null) as (s: string | undefined, m: string | null) => Set<number>;
    expect(onlyOpp('player', 'battle')).toBe(full);
    expect(onlyOpp('opponent', 'battle')).toBe(opp);
    const onlyMine = buildLegalIdsResolver(full, null, mine) as (s: string | undefined, m: string | null) => Set<number>;
    expect(onlyMine('player', 'battle')).toBe(mine);
    expect(onlyMine('opponent', 'battle')).toBe(full);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/scan/myTeam.test.ts src/features/scan/battleRoster.test.ts`
Expected: myTeam tests FAIL (module not found); the new resolver describe FAILS (`buildLegalIdsResolver` not exported); existing battleRoster tests PASS.

- [ ] **Step 3: Implement**

```typescript
// src/features/scan/myTeam.ts
// The user's selected Team for the calculator's attacker chips. Stores the
// TEAM ID only (a string — Team.id is a uuid-ish string); members derive
// live from useTeams() so team edits reflect immediately. Lifecycle is
// independent of battles: persists until cleared or replaced.
const KEY = 'calc.myTeamId';

export function readMyTeamId(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || !raw.trim()) {
      if (raw != null) localStorage.removeItem(KEY);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function saveMyTeamId(id: string): void {
  if (!id.trim()) return;
  try { localStorage.setItem(KEY, id); } catch { /* storage unavailable */ }
}

export function clearMyTeamId(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
```

Append to `src/features/scan/battleRoster.ts` (add the imports at the top: `import type { LegalIdsBySide } from './scanFrame';` — plus `ScanSide`/`ScanMode` types via the existing type imports if needed):

```typescript
// Central mask policy for scans: battle-mode opponent tiles narrow to the
// confirmed roster's family, battle-mode player tiles to the user's own
// team's family; team-preview and legacy paths always use the full format
// set. With no masks at all, the ORIGINAL Set is returned unchanged so
// scanFrame's identity-keyed refs cache behaves exactly as before.
export function buildLegalIdsResolver(
  full: Set<number>,
  oppFamily: Set<number> | null,
  myFamily: Set<number> | null,
): LegalIdsBySide {
  if (!oppFamily && !myFamily) return full;
  return (side, mode) => {
    if (mode !== 'battle') return full;
    if (side === 'player') return myFamily ?? full;
    return oppFamily ?? full;
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/scan/myTeam.test.ts src/features/scan/battleRoster.test.ts`
Expected: PASS (all, including the pre-existing battleRoster tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/myTeam.ts src/features/scan/myTeam.test.ts src/features/scan/battleRoster.ts src/features/scan/battleRoster.test.ts
git commit -m "feat: my-team id store + central legalIds resolver policy"
```

---

### Task 2: `RosterChipRow` extraction + `MyTeamChips` + `useMyTeam`

**Files:**
- Create: `src/features/scan/RosterChipRow.tsx`, `src/features/scan/MyTeamChips.tsx`, `src/features/scan/useMyTeam.ts`
- Modify: `src/features/scan/OpponentRosterChips.tsx` (becomes a thin wrapper — same rendered DOM/classes/aria)

**Interfaces:**
- Consumes: `readMyTeamId/saveMyTeamId/clearMyTeamId` (Task 1); `TeamWithMembers`, `TeamMember` from `@/db/repositories/team.repo`; `PokemonBaseStats`.
- Produces: `RosterChipRow` (props below); `MyTeamChips` default export (props below); `useMyTeam(teams: TeamWithMembers[]): { teamId: string | null; team: TeamWithMembers | null; selectTeam: (id: string) => void; clearTeam: () => void }` — Task 3 wires these.

- [ ] **Step 1: Create the shared chip row**

```tsx
// src/features/scan/RosterChipRow.tsx
// Shared presentational chip row for the calculator panels: a labeled,
// horizontally scrollable strip of tappable Pokémon sprites with an ✕ at
// the end. Both the opponent roster and the user's own team render this.
import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';

export interface ChipEntry {
  id: number;
  name: string;
}

interface RosterChipRowProps {
  label: string;
  tone: 'danger' | 'accent';
  entries: ChipEntry[];
  activeId?: number | null;
  onPick: (id: number) => void;
  onClear: () => void;
  pickAriaLabel: (name: string) => string;
  clearAriaLabel: string;
}

const RosterChipRow: React.FC<RosterChipRowProps> = ({ label, tone, entries, activeId, onPick, onClear, pickAriaLabel, clearAriaLabel }) => (
  <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-lg border border-line-2 bg-inset p-1">
    <span className={`px-1 text-[10px] font-semibold ${tone === 'danger' ? 'text-danger' : 'text-accent'}`}>{label}</span>
    {entries.map((e) => (
      <button
        key={e.id}
        type="button"
        onClick={() => onPick(e.id)}
        className={`shrink-0 rounded-lg border p-0.5 ${activeId === e.id ? 'border-transparent bg-accent-soft ring-2 ring-accent' : 'border-line bg-card'}`}
        title={e.name}
        aria-label={pickAriaLabel(e.name)}
      >
        <PokemonImage id={e.id} name={e.name} className="w-8 h-8" />
      </button>
    ))}
    <button
      type="button"
      className="ml-auto shrink-0 px-1.5 py-0.5 text-danger hover:bg-danger-soft rounded"
      onClick={onClear}
      aria-label={clearAriaLabel}
      title={clearAriaLabel}
    >
      ✕
    </button>
  </div>
);

export default RosterChipRow;
```

- [ ] **Step 2: Rewrite `OpponentRosterChips` as a thin wrapper (behavior-preserving)**

```tsx
// src/features/scan/OpponentRosterChips.tsx
// Compact battle-roster chip row rendered inside the Defender panel: the
// opponent's confirmed six, one tap -> load as defender, ✕ ends the session.
import React from 'react';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import RosterChipRow from './RosterChipRow';

interface OpponentRosterChipsProps {
  roster: number[];
  byId: Map<number, PokemonBaseStats>;
  /** Current defender species id — its chip gets the selected ring. */
  activeId?: number | null;
  onPick: (id: number) => void;
  onClear: () => void;
}

const OpponentRosterChips: React.FC<OpponentRosterChipsProps> = ({ roster, byId, activeId, onPick, onClear }) => (
  <RosterChipRow
    label="Opp"
    tone="danger"
    entries={roster.map((id) => ({ id, name: byId.get(id)?.nameEn ?? `#${id}` }))}
    activeId={activeId}
    onPick={onPick}
    onClear={onClear}
    pickAriaLabel={(name) => `Set ${name} as defender`}
    clearAriaLabel="End battle (clear opponent roster)"
  />
);

export default OpponentRosterChips;
```

(One deliberate nuance: the old sprite `name` fell back to `'pokemon'` while the title fell back to `#${id}`; the wrapper now uses `#${id}` for both — the accessible-name fallback strictly improves. Everything else is byte-equivalent.)

- [ ] **Step 3: Create `MyTeamChips`**

```tsx
// src/features/scan/MyTeamChips.tsx
// The user's own team in the Attacker panel: no team selected -> a compact
// native select of saved Teams; selected -> a chip row where one tap loads
// that member's FULL saved build as attacker. ✕ clears the selection.
import React from 'react';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { TeamMember, TeamWithMembers } from '@/db/repositories/team.repo';
import RosterChipRow from './RosterChipRow';

interface MyTeamChipsProps {
  teams: TeamWithMembers[];
  team: TeamWithMembers | null;
  byId: Map<number, PokemonBaseStats>;
  /** Current attacker species id — its chip gets the selected ring. */
  activeId?: number | null;
  onSelectTeam: (id: string) => void;
  onPick: (member: TeamMember) => void;
  onClear: () => void;
}

const MyTeamChips: React.FC<MyTeamChipsProps> = ({ teams, team, byId, activeId, onSelectTeam, onPick, onClear }) => {
  if (!team) {
    return (
      <div className="mb-3">
        <select
          className="w-full rounded-lg border border-line-2 bg-inset px-2 py-1.5 text-sm text-ink-2"
          value=""
          onChange={(e) => e.target.value && onSelectTeam(e.target.value)}
          aria-label="Select my team"
        >
          <option value="" disabled>
            {teams.length ? 'My team ▾' : 'No teams yet'}
          </option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    );
  }

  const members = team.members.filter((m) => m.configuration.selectedId != null);
  return (
    <RosterChipRow
      label="You"
      tone="accent"
      entries={members.map((m) => ({
        id: m.configuration.selectedId as number,
        name: byId.get(m.configuration.selectedId as number)?.nameEn ?? `#${m.configuration.selectedId}`,
      }))}
      activeId={activeId}
      onPick={(id) => {
        // Duplicate species on one team: the first member with that id wins.
        const member = members.find((m) => m.configuration.selectedId === id);
        if (member) onPick(member);
      }}
      onClear={onClear}
      pickAriaLabel={(name) => `Load ${name} as attacker`}
      clearAriaLabel="Clear my team selection"
    />
  );
};

export default MyTeamChips;
```

- [ ] **Step 4: Create `useMyTeam`**

```typescript
// src/features/scan/useMyTeam.ts
import { useCallback, useMemo, useState } from 'react';
import type { TeamWithMembers } from '@/db/repositories/team.repo';
import { clearMyTeamId, readMyTeamId, saveMyTeamId } from './myTeam';

export function useMyTeam(teams: TeamWithMembers[]) {
  const [teamId, setTeamId] = useState<string | null>(() => readMyTeamId());
  // A stored id with no matching team (deleted, or teams still loading)
  // derives to null -> the picker shows again; the stored id is harmless.
  const team = useMemo(() => teams.find((t) => t.id === teamId) ?? null, [teams, teamId]);
  const selectTeam = useCallback((id: string) => { saveMyTeamId(id); setTeamId(id); }, []);
  const clearTeam = useCallback(() => { clearMyTeamId(); setTeamId(null); }, []);
  return { teamId, team, selectTeam, clearTeam };
}
```

- [ ] **Step 5: Verify types + suite**

Run: `npx tsc --noEmit` — clean. Run: `npm test` — all pass (the OpponentRosterChips refactor changes no behavior; nothing tests it directly, but the suite catches import breakage).

- [ ] **Step 6: Commit**

```bash
git add src/features/scan/RosterChipRow.tsx src/features/scan/OpponentRosterChips.tsx src/features/scan/MyTeamChips.tsx src/features/scan/useMyTeam.ts
git commit -m "feat: shared chip row + my-team chips component + hook"
```

---

### Task 3: Slot threading + page wiring + modal mask extension

**Files:**
- Modify: `src/features/damage-calculator/components/mobile/ArenaCalculator.tsx` (add `attackerExtra`, pass to p1 card)
- Modify: `src/features/damage-calculator/components/AttackerPanel.tsx` (add `attackerExtra`, wrap render — same treatment `DefenderPanel` got)
- Modify: `src/features/scan/ScanTeamModal.tsx` (add `myTeamIds` prop; replace the inline resolver with `buildLegalIdsResolver`)
- Modify: `src/pages/DamageCalculator/index.tsx` (useMyTeam, compose `myTeamChips`, thread `attackerExtra` + `myTeamIds` to both branches)

**Interfaces:**
- Consumes: everything Tasks 1–2 produced; existing `formFamilyIds`, `useTeams` (already imported on the page at line 32; extend the destructure at line 58 to `const { teams, createTeam } = useTeams();`), `actions.handleLoadConfig` (page-level `actions` from `useCalculatorActions`, index.tsx:57).
- Produces: `attackerExtra?: React.ReactNode` on `ArenaCalculator` and `AttackerPanel`; `myTeamIds?: number[] | null` on `ScanTeamModal`.

- [ ] **Step 1: Thread `attackerExtra` through the mobile layout**

`ArenaCalculator.tsx`: add to the destructure and prop type (next to `defenderExtra`):

```tsx
  /** Optional slot rendered under the Attacker card's header (my-team chips). */
  attackerExtra?: React.ReactNode;
```

and pass it on the p1 card render (the line with `role="Attacker"`):

```tsx
        <ArenaMonCard side="p1" role="Attacker" state={state} dispatch={dispatch} nameOf={nameOf} onOpenPicker={openPicker('p1')} onOpenAdvanced={() => setAdvancedSide('p1')} extra={attackerExtra} />
```

(`ArenaMonCard` already has the generic `extra` slot from PR #22 — no change there.)

- [ ] **Step 2: Add `attackerExtra` to the desktop `AttackerPanel`**

In `src/features/damage-calculator/components/AttackerPanel.tsx`: add to `Props`:

```tsx
  /** Optional slot rendered above the panel (my-team chips). */
  attackerExtra?: React.ReactNode;
```

destructure it, and wrap the return exactly as `DefenderPanel` was wrapped (every `PokemonPanel` prop stays byte-identical):

```tsx
  return (
    <div>
      {attackerExtra}
      <PokemonPanel
        …existing props unchanged…
      />
    </div>
  );
```

- [ ] **Step 3: Extend `ScanTeamModal` with `myTeamIds` + central resolver**

Add the prop (after `onConfirmRoster`):

```typescript
  /** The user's own team's species ids — battle scans mask PLAYER tiles to their form families. */
  myTeamIds?: number[] | null;
```

Destructure `myTeamIds` in the signature. Replace the `maskIds` + `legalIds` memos with:

```typescript
  const maskIds = useMemo(
    () => (battleRoster && battleRoster.length > 0 ? formFamilyIds(battleRoster, pokemonList) : null),
    [battleRoster, pokemonList],
  );
  const myMaskIds = useMemo(
    () => (myTeamIds && myTeamIds.length > 0 ? formFamilyIds(myTeamIds, pokemonList) : null),
    [myTeamIds, pokemonList],
  );
  // Central mask policy (tested in battleRoster.test.ts): battle-mode
  // opponent tiles -> roster family, battle-mode player tiles -> my-team
  // family, everything else (team preview, legacy) -> the full format set.
  const legalIds = useMemo<LegalIdsBySide>(
    () => buildLegalIdsResolver(fullLegalIds, maskIds, myMaskIds),
    [fullLegalIds, maskIds, myMaskIds],
  );
```

Update the import: `import { formFamilyIds, buildLegalIdsResolver } from './battleRoster';`. The old inline-resolver comment block is deleted (the policy comment now lives on the helper).

- [ ] **Step 4: Wire the page**

In `src/pages/DamageCalculator/index.tsx`:

```typescript
import MyTeamChips from '@/features/scan/MyTeamChips';
import { useMyTeam } from '@/features/scan/useMyTeam';
```

Extend the `useTeams` destructure (line 58): `const { teams, createTeam } = useTeams();`

After the `useBattleRoster` line (~62):

```typescript
  const { team: myTeam, selectTeam, clearTeam } = useMyTeam(teams);
  const myTeamIds = useMemo(
    () => (myTeam ? myTeam.members.map((m) => m.configuration.selectedId).filter((n): n is number => n != null) : null),
    [myTeam],
  );
```

Next to the `rosterChips` composition (~143):

```tsx
  const myTeamChips = (
    <MyTeamChips
      teams={teams}
      team={myTeam}
      byId={pokemonById}
      activeId={state.p1.selectedId}
      onSelectTeam={selectTeam}
      onPick={(member) => void actions.handleLoadConfig('p1', member.configuration)}
      onClear={clearTeam}
    />
  );
```

(Note: `myTeamChips` is ALWAYS rendered — the picker is its empty state — unlike `rosterChips`, which is null without a roster.)

Then in BOTH branches: add `attackerExtra={myTeamChips}` to `<ArenaCalculator …/>` (mobile) and `<AttackerPanel …/>` (desktop), and add `myTeamIds={myTeamIds}` to BOTH `<ScanTeamModal …/>` renders.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` — clean. Run: `npm test` — all pass (the resolver policy tests from Task 1 cover the mask; plain-Set parity keeps the golden floor identical).

- [ ] **Step 6: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaCalculator.tsx src/features/damage-calculator/components/AttackerPanel.tsx src/features/scan/ScanTeamModal.tsx src/pages/DamageCalculator/index.tsx
git commit -m "feat: my-team chips in the Attacker panel + player-side scan mask"
```

---

### Task 4: Browser verification (both layouts)

**Files:** none — verification only.

- [ ] **Step 1: Setup**

`npm run dev`, open the Calculator. Ensure at least one saved Team exists (create one on the Teams page if needed).

- [ ] **Step 2: Mobile (~375px)**

1. Attacker card shows "My team ▾" select under its header; picking a team swaps it for the "You" chip row.
2. Tap a chip → the member loads as attacker WITH its saved build (moves/item/ability/EVs visible, not blank), and its chip gets the ring.
3. Reload → selection persists. ✕ → picker returns; `localStorage.getItem('calc.myTeamId')` is null.
4. Opponent chips (Defender card) unaffected throughout.

- [ ] **Step 3: Desktop (≥1280px)**

Same checks; the chip row/picker sits above the Attacker panel, defender column unaffected.

- [ ] **Step 4: Mask check**

With a team selected, scan a battle frame via Scan opponent: the You row's candidates must come only from your team's form families; with the team cleared, You-row candidates are unrestricted again. Opponent-side masking behaves as before in both cases.

- [ ] **Step 5: Hand off**

`git status --short` clean → superpowers:finishing-a-development-branch.
