# Landscape Fix-Scan (9a "Fix in place") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landscape player team-import scan review with the design's "9a — Fix in place" experience: a six-mon glance with confidence badges, and a per-mon detail whose species candidate band re-derives the slot when a misread is corrected.

**Architecture:** The recognition engine (`usePlayerTeamScan` → `mergePlayerScan` → `setSlotSpecies`) is unchanged. We add one pure module (`playerScanFlags.ts`) that (a) holds the edit-glue extracted from `PlayerScanPanel` so both panels share the save mapping, and (b) derives "why is this flagged" signals from data already in the merged scan. A new landscape component (`ArenaPlayerScanReview.tsx`) renders glance ↔ detail on the Arena design system and consumes those helpers. Two one-line edits wire it in and de-duplicate the glue.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest (`*.test.ts(x)`), the ported Arena design system (`src/design-system/arena`, CSS custom-property tokens in `tokens.css`).

## Global Constraints

- **Landscape only.** Change is confined to `ArenaAddTeam`'s `method='scan'` branch (rendered only when `mode === 'arena-landscape'`). Portrait `PlayerScanModal` / `PlayerScanPanel` UI must stay byte-for-byte behavior-identical.
- **English-only.** No i18n / locale mechanism. UI strings are hardcoded English, matching today's `PlayerScanPanel`.
- **Derivable signals only.** No scanner changes. Flags come only from existing `PlayerSlot` fields + `PlayerScanVocab`. No alternate-digit picker, no ability⇒species reverse inference.
- **Arena DS tokens only** for styling: `--field` / `--field-soft` / `--field-line` (amber), `--safe` / `--safe-soft` / `--safe-line` (green), `--danger*` (red), `--accent*`, `--surface-inset` / `--surface-card`, `--line-1` / `--line-2`, `--ink-1..4`, `--r-sm` / `--r-md` / `--r-pill`, `--font-display` / `--font-ui` / `--font-mono`. All confirmed present in `src/design-system/arena/tokens.css`.
- **Visual source of truth:** Claude Design project `6824e3f6-e49b-45fd-8833-c080661e7dd1`, file `FixScan.dc.html`, `variant="inline"` (the "TEAM GLANCE" + "VARIANT: INLINE" blocks). Match its layout, spacing, and token usage.

---

## File Structure

- `src/features/scan/playerScanFlags.ts` — **NEW, pure.** `EditableSlot`, `toEditable`, `applyEditsToSlots` (moved from `PlayerScanPanel`), and `deriveSlotFlags` / `isSlotFlagged` (new).
- `src/features/scan/playerScanFlags.test.ts` — **NEW.** Unit tests for the pure helpers.
- `src/features/scan/PlayerScanPanel.tsx` — **MODIFY.** Import the moved helpers instead of local copies. No UI change.
- `src/features/scan/ArenaPlayerScanReview.tsx` — **NEW.** The 9a landscape UI (capture chips → glance → detail).
- `src/features/teams/components/mobile/ArenaAddTeam.tsx` — **MODIFY.** Render `ArenaPlayerScanReview` in the `method==='scan'` branch.

---

## Task 1: Pure flag + edit-glue module

**Files:**
- Create: `src/features/scan/playerScanFlags.ts`
- Test: `src/features/scan/playerScanFlags.test.ts`

**Interfaces:**
- Consumes: `PlayerSlot`, `MergedPlayerScan`, `SlotStatRead` from `./mergePlayerScan`; `Candidate` from `./types`; `PlayerScanVocab` from `@/db/repositories/scan.repo`.
- Produces:
  - `interface EditableSlot { speciesId: number | null; ability: string | null; item: string | null; moves: (number | null)[]; sp: number[]; nature: string }`
  - `toEditable(slot: PlayerSlot): EditableSlot`
  - `applyEditsToSlots(merged: MergedPlayerScan, edits: Record<number, EditableSlot>): MergedPlayerScan`
  - `interface SlotFlags { speciesUncertain: boolean; speciesDisagreement: boolean; illegalMoves: number[]; badAbility: boolean; ambiguousItem: boolean; inconsistentSp: number[] }`
  - `deriveSlotFlags(slot: PlayerSlot, vocab: PlayerScanVocab | null): SlotFlags`
  - `isSlotFlagged(f: SlotFlags): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/features/scan/playerScanFlags.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { PlayerSlot } from './mergePlayerScan';
import type { PlayerScanVocab } from '@/db/repositories/scan.repo';
import { toEditable, applyEditsToSlots, deriveSlotFlags, isSlotFlagged } from './playerScanFlags';

// Minimal PlayerSlot factory — only the fields the helpers read.
function slot(over: Partial<PlayerSlot> = {}): PlayerSlot {
  return {
    slot: 0,
    species: [{ id: 445, score: 0.9 }],
    ability: { value: 'Rough Skin', options: [{ value: 'Rough Skin', score: 0.9 }], confident: true },
    item: { value: 'Sitrus Berry', options: [{ value: 'Sitrus Berry', score: 0.9 }], confident: true },
    moves: [
      { value: 100, options: [], confident: true },
      { value: null, options: [], confident: false },
      { value: null, options: [], confident: false },
      { value: null, options: [], confident: false },
    ],
    statReads: [
      { stat: 200, sp: 20, mult: null, consistent: true },
      { stat: 150, sp: 10, mult: 1, consistent: true },
      { stat: 100, sp: 0, mult: 1, consistent: true },
      { stat: 90, sp: 0, mult: 1, consistent: true },
      { stat: 110, sp: 0, mult: 1, consistent: true },
      { stat: 120, sp: 0, mult: 1, consistent: true },
    ],
    nature: { name: 'Adamant', confident: true },
    warnings: [],
    ...over,
  };
}

// Fake vocab: species 445 knows move 100 and ability 'Rough Skin'.
const vocab = {
  movesFor: (id: number) => (id === 445 ? [{ moveId: 100 }] : []),
  abilitiesFor: (id: number) => (id === 445 ? [{ key: 'Rough Skin' }] : []),
  items: [],
} as unknown as PlayerScanVocab;

describe('applyEditsToSlots', () => {
  it('pins the edited species with score 1 and threads field edits', () => {
    const merged = { lang: 'en' as const, slots: [slot()], warnings: [] };
    const edits = { 0: { ...toEditable(slot()), speciesId: 130, ability: 'Intimidate', sp: [4, 252, 0, 0, 0, 252] } };
    const out = applyEditsToSlots(merged, edits);
    expect(out.slots[0].species).toEqual([{ id: 130, score: 1 }]);
    expect(out.slots[0].ability.value).toBe('Intimidate');
    expect(out.slots[0].statReads[1].sp).toBe(252);
  });
});

describe('deriveSlotFlags', () => {
  it('is clean when everything reads legal and confident', () => {
    expect(isSlotFlagged(deriveSlotFlags(slot(), vocab))).toBe(false);
  });
  it('flags an illegal move for the current species', () => {
    const f = deriveSlotFlags(slot({ moves: [{ value: 999, options: [], confident: true }, ...slot().moves.slice(1)] }), vocab);
    expect(f.illegalMoves).toEqual([0]);
    expect(isSlotFlagged(f)).toBe(true);
  });
  it('flags an off-species ability', () => {
    expect(deriveSlotFlags(slot({ ability: { value: 'Levitate', options: [], confident: true } }), vocab).badAbility).toBe(true);
  });
  it('flags a low-confidence species and a cross-screen disagreement', () => {
    expect(deriveSlotFlags(slot({ species: [{ id: 445, score: 0.3 }] }), vocab).speciesUncertain).toBe(true);
    expect(deriveSlotFlags(slot({ warnings: ['species disagreement between moves and stats screens'] }), vocab).speciesDisagreement).toBe(true);
  });
  it('flags near-tied item options and an inconsistent stat row', () => {
    const amb = deriveSlotFlags(slot({ item: { value: 'Sitrus Berry', options: [{ value: 'Sitrus Berry', score: 0.5 }, { value: 'Lum Berry', score: 0.48 }], confident: false } }), vocab);
    expect(amb.ambiguousItem).toBe(true);
    const bad = slot();
    bad.statReads[1] = { ...bad.statReads[1], consistent: false };
    expect(deriveSlotFlags(bad, vocab).inconsistentSp).toEqual([1]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/scan/playerScanFlags.test.ts`
Expected: FAIL — `playerScanFlags` module / exports not found.

- [ ] **Step 3: Write the implementation**

Create `src/features/scan/playerScanFlags.ts`:

```ts
import type { MergedPlayerScan, PlayerSlot } from './mergePlayerScan';
import type { PlayerScanVocab } from '@/db/repositories/scan.repo';

// ---- edit glue (moved verbatim from PlayerScanPanel; shared by both panels) ----

export interface EditableSlot {
  speciesId: number | null;
  ability: string | null;
  item: string | null;
  moves: (number | null)[];
  sp: number[]; // length 6, [hp,atk,def,spa,spd,spe]
  nature: string;
}

export const toEditable = (slot: PlayerSlot): EditableSlot => ({
  speciesId: slot.species[0]?.id ?? null,
  ability: slot.ability.value,
  item: slot.item.value,
  moves: slot.moves.map((m) => m.value),
  sp: [0, 1, 2, 3, 4, 5].map((i) => slot.statReads[i]?.sp ?? 0),
  nature: slot.nature.name,
});

/** Fold the local edits back onto the merged slots, ready for buildConfigs. */
export function applyEditsToSlots(merged: MergedPlayerScan, edits: Record<number, EditableSlot>): MergedPlayerScan {
  const slots: PlayerSlot[] = merged.slots.map((slot) => {
    const e = edits[slot.slot] ?? toEditable(slot);
    const species = e.speciesId != null ? [{ id: e.speciesId, score: 1 }] : slot.species;
    return {
      ...slot,
      species,
      ability: { ...slot.ability, value: e.ability },
      item: { ...slot.item, value: e.item },
      moves: slot.moves.map((m, i) => ({ ...m, value: e.moves[i] ?? null })),
      statReads: e.sp.map((sp, i) => ({ ...(slot.statReads[i] ?? { stat: null, mult: null, consistent: false }), sp })),
      nature: { ...slot.nature, name: e.nature },
    };
  });
  return { ...merged, slots };
}

// ---- conflict-signal derivation (new; derivable-only) ----

export interface SlotFlags {
  speciesUncertain: boolean;    // species top score < 0.5 (same bar PlayerScanPanel uses)
  speciesDisagreement: boolean; // moves/stats screens read different species
  illegalMoves: number[];       // move indices whose id is not in the species learnset
  badAbility: boolean;          // read ability is not one of the species' abilities
  ambiguousItem: boolean;       // top two item reads are near-tied
  inconsistentSp: number[];     // stat indices whose read failed the stat-math cross-check
}

const SPECIES_DISAGREE_WARNING = 'species disagreement between moves and stats screens';
// ponytail: 0.08 item-tie margin is a calibration knob — widen if Sitrus/Lum-style pairs slip through.
const ITEM_AMBIGUOUS_MARGIN = 0.08;

export function deriveSlotFlags(slot: PlayerSlot, vocab: PlayerScanVocab | null): SlotFlags {
  const speciesId = slot.species[0]?.id ?? null;
  const legalMoveIds = speciesId != null && vocab ? new Set(vocab.movesFor(speciesId).map((m) => m.moveId)) : null;
  const legalAbilities = speciesId != null && vocab ? new Set(vocab.abilitiesFor(speciesId).map((a) => a.key)) : null;

  const illegalMoves: number[] = [];
  slot.moves.forEach((m, i) => { if (m.value != null && legalMoveIds && !legalMoveIds.has(m.value)) illegalMoves.push(i); });

  const inconsistentSp: number[] = [];
  slot.statReads.forEach((s, i) => { if (s && !s.consistent) inconsistentSp.push(i); });

  const opts = slot.item.options;
  const ambiguousItem = opts.length >= 2 && opts[0].score - opts[1].score < ITEM_AMBIGUOUS_MARGIN;

  return {
    speciesUncertain: (slot.species[0]?.score ?? 0) < 0.5,
    speciesDisagreement: slot.warnings.includes(SPECIES_DISAGREE_WARNING),
    illegalMoves,
    badAbility: slot.ability.value != null && !!legalAbilities && !legalAbilities.has(slot.ability.value),
    ambiguousItem,
    inconsistentSp,
  };
}

export const isSlotFlagged = (f: SlotFlags): boolean =>
  f.speciesUncertain || f.speciesDisagreement || f.illegalMoves.length > 0 ||
  f.badAbility || f.ambiguousItem || f.inconsistentSp.length > 0;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/scan/playerScanFlags.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/playerScanFlags.ts src/features/scan/playerScanFlags.test.ts
git commit -m "feat(scan): pure slot-flag + edit-glue helpers for fix-scan"
```

---

## Task 2: De-duplicate PlayerScanPanel onto the shared glue

**Files:**
- Modify: `src/features/scan/PlayerScanPanel.tsx`

**Interfaces:**
- Consumes: `EditableSlot`, `toEditable`, `applyEditsToSlots` from `./playerScanFlags` (Task 1).
- Produces: nothing new. Portrait behavior must be identical.

- [ ] **Step 1: Replace the local glue with imports**

In `src/features/scan/PlayerScanPanel.tsx`:

1. Add to the imports near the top (after the `buildConfigs` import on line 12):

```ts
import { buildConfigs, type MergedPlayerScan, type PlayerSlot } from './mergePlayerScan';
import { toEditable, applyEditsToSlots, type EditableSlot } from './playerScanFlags';
```

2. Delete the local `EditableSlot` interface (lines 27-35) and the local `const toEditable = …` (lines 41-48). They now come from the import.

3. Replace the body of `handleSave` (lines 125-143) with:

```ts
  const handleSave = () => {
    if (!merged || !vocab) return;
    const configs = buildConfigs(applyEditsToSlots(merged, edits), basesById, movesById, vocab);
    onSave(configs);
  };
```

4. If `MergedPlayerScan` / `PlayerSlot` are now unused in this file, drop them from the `./mergePlayerScan` import to satisfy lint. (Keep `buildConfigs`.)

- [ ] **Step 2: Verify the portrait panel still type-checks and tests pass**

Run: `npx tsc --noEmit && npx vitest run src/features/scan`
Expected: PASS. No behavior change — the save output is identical (same mapping, now shared).

- [ ] **Step 3: Commit**

```bash
git add src/features/scan/PlayerScanPanel.tsx
git commit -m "refactor(scan): PlayerScanPanel uses shared edit-glue helpers"
```

---

## Task 3: ArenaPlayerScanReview — the 9a landscape UI

**Files:**
- Create: `src/features/scan/ArenaPlayerScanReview.tsx`

**Interfaces:**
- Consumes: `usePlayerTeamScan` (`merged`, `vocab`, `movesImage`, `statsImage`, `busy`, `lastError`, `addFrame`, `setSlotSpecies`, `reset`) from `./usePlayerTeamScan`; `buildConfigs` from `./mergePlayerScan`; `toEditable`, `applyEditsToSlots`, `deriveSlotFlags`, `isSlotFlagged`, `type EditableSlot`, `type SlotFlags` from `./playerScanFlags`; `filePickerSource`, `cameraSource` from `./captureSource`; `CropStep` from `./CropStep`; `PokemonImagePicker` from `./PokemonImagePicker`; `loadClassifier` from `./classifier`; `Sprite`, `Icon` from `@/design-system/arena`.
- Produces: `export const ArenaPlayerScanReview: React.FC<PlayerScanPanelProps>` — **same props as `PlayerScanPanel`** (`{ pokemonList, moveList, onSave, onCancel?, active?, deps? }`, importing `PlayerScanPanelProps` / `PlayerTeamScanDeps` from `./PlayerScanPanel` / `./usePlayerTeamScan`). Drop-in for `PlayerScanPanel` in the landscape scan slot.

> **Note on verification:** this is a visual/interaction port, verified in-app (Task 5), not by unit test. Reuse the state glue below verbatim; reproduce the **layout** from `FixScan.dc.html` `variant="inline"` (the TEAM GLANCE and VARIANT: INLINE blocks) using the DS tokens listed in Global Constraints. The code below is the complete logic + the render skeleton for every distinct region; fill the repetitive per-row markup by following the mock.

- [ ] **Step 1: Scaffold the component with hook + navigation state**

Create `src/features/scan/ArenaPlayerScanReview.tsx` with the shared logic. This mirrors `PlayerScanPanel`'s hook wiring but adds `openSlot` for glance↔detail:

```tsx
import React, { useMemo, useState } from 'react';
import { Sprite, Icon } from '@/design-system/arena';
import { usePlayerTeamScan, type PlayerTeamScanDeps } from './usePlayerTeamScan';
import { buildConfigs } from './mergePlayerScan';
import { toEditable, applyEditsToSlots, deriveSlotFlags, isSlotFlagged, type EditableSlot, type SlotFlags } from './playerScanFlags';
import { filePickerSource, cameraSource } from './captureSource';
import CropStep from './CropStep';
import PokemonImagePicker from './PokemonImagePicker';
import { loadClassifier } from './classifier';
import { NATURES, getFormattedNature } from '@/features/pokemon/utils/pokemon-natures';
import type { PlayerScanPanelProps } from './PlayerScanPanel';
import type { PlayerScreenKind } from './playerTypes';

const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];

export const ArenaPlayerScanReview: React.FC<PlayerScanPanelProps> = ({ pokemonList, moveList, onSave, onCancel, active = true, deps }) => {
  const { movesImage, statsImage, merged, vocab, lastError, busy, addFrame, setSlotSpecies, reset } =
    usePlayerTeamScan(pokemonList, deps as PlayerTeamScanDeps | undefined);

  React.useEffect(() => { if (active) void loadClassifier(); }, [active]);

  const basesById = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);
  const movesById = useMemo(() => new Map(moveList.map((m) => [m.id, m])), [moveList]);
  const itemNames = useMemo(() => [...new Set((vocab?.items ?? []).map((i) => i.key))], [vocab]);

  const [edits, setEdits] = useState<Record<number, EditableSlot>>({});
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [croppingKind, setCroppingKind] = useState<PlayerScreenKind | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Reset on hide (host closed).
  React.useEffect(() => {
    if (!active) { reset(); setEdits({}); setOpenSlot(null); setCroppingKind(null); setPickerOpen(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Seed/refresh edits when a screenshot finishes (same rule as PlayerScanPanel).
  const prevStatusesRef = React.useRef({ moves: movesImage.status, stats: statsImage.status });
  React.useEffect(() => {
    if (!merged) return;
    const prev = prevStatusesRef.current;
    const justFinished = (movesImage.status === 'done' && prev.moves !== 'done') || (statsImage.status === 'done' && prev.stats !== 'done');
    prevStatusesRef.current = { moves: movesImage.status, stats: statsImage.status };
    setEdits((prevEdits) => {
      const next: Record<number, EditableSlot> = {};
      for (const s of merged.slots) next[s.slot] = justFinished ? toEditable(s) : prevEdits[s.slot] ?? toEditable(s);
      return next;
    });
  }, [merged, movesImage.status, statsImage.status]);

  const updateEdit = (slot: number, patch: Partial<EditableSlot>) =>
    setEdits((prev) => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));

  const pickSpecies = (slot: number, id: number) => {
    setSlotSpecies(slot, id);                                   // re-scans + re-derives the slot
    setEdits((prev) => { const next = { ...prev }; delete next[slot]; return next; }); // drop stale local edits
    setPickerOpen(false);
  };

  const captureFor = async (source: typeof filePickerSource | typeof cameraSource) => {
    const frame = await source.capture();
    if (frame) await addFrame(frame.blob);
  };

  const handleSave = () => {
    if (!merged || !vocab) return;
    onSave(buildConfigs(applyEditsToSlots(merged, edits), basesById, movesById, vocab));
  };

  const hasSpecies = Object.values(edits).some((e) => e.speciesId != null);

  // ...render (Steps 2-4)
  return null; // replaced below
};

export default ArenaPlayerScanReview;
```

- [ ] **Step 2: Render the capture chips + team glance**

Replace the `return null` with the top-level view switch. When there's no `merged` team yet, show the two Arena-styled capture chips; once scanned and no slot is open, show the 3×2 glance. Each glance card computes `deriveSlotFlags` and paints amber when `isSlotFlagged`. Follow the mock's TEAM GLANCE block for exact card structure (sprite tile 36px, name 11.5px, four move rows in a 2-col grid, confidence badge top-right).

```tsx
  const box: React.CSSProperties = { display: 'flex', width: '100%', height: '100%', flexDirection: 'column', background: 'var(--bg-page)', color: 'var(--text-body)', fontFamily: 'var(--font-ui)', overflow: 'hidden' };

  // --- capture chips (before a full scan) ---
  const renderChip = (kind: PlayerScreenKind) => {
    const state = kind === 'moves' ? movesImage : statsImage;
    const label = kind === 'moves' ? 'Moves & item' : 'Stats & nature';
    return (
      <div key={kind} style={{ flex: 1, padding: 12, borderRadius: 'var(--r-md)', border: '1px solid var(--line-2)', background: 'var(--surface-inset)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-1)' }}>{label}</span>
          {state.status === 'done' && <Icon name="check" size={14} color="var(--safe)" />}
          {state.status === 'error' && <span style={{ fontSize: 11, color: 'var(--danger)' }}>Error</span>}
        </div>
        {croppingKind === kind && state.blob ? (
          <CropStep blob={state.blob} onCropped={(b) => { setCroppingKind(null); void addFrame(b); }} onCancel={() => setCroppingKind(null)} />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" style={btnAccent} onClick={() => captureFor(filePickerSource)}>Add screenshot</button>
            <button type="button" style={btnAccent} onClick={() => captureFor(cameraSource)}>Take photo</button>
            {state.blob && <button type="button" style={btnGhost} onClick={() => setCroppingKind(kind)}>Crop &amp; retry</button>}
          </div>
        )}
      </div>
    );
  };

  if (!merged || merged.slots.length === 0) {
    return (
      <div style={box}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px' }}>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 10px' }}>Add both screens of your team — moves/item and stats. Order doesn't matter.</p>
          <div style={{ display: 'flex', gap: 12 }}>{renderChip('moves')}{renderChip('stats')}</div>
          {lastError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 10 }}>{lastError}</p>}
          {busy && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 10 }}>Scanning…</p>}
        </div>
      </div>
    );
  }

  // --- team glance (3x2) ---
  if (openSlot == null) {
    return (
      <div style={box}>
        <div style={{ flex: 1, minHeight: 0, padding: '11px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(2,1fr)', gap: 9, height: '100%' }}>
            {merged.slots.map((s) => {
              const e = edits[s.slot] ?? toEditable(s);
              const flags = deriveSlotFlags(s, vocab);
              const flagged = isSlotFlagged(flags);
              const name = e.speciesId != null ? basesById.get(e.speciesId)?.nameEn ?? 'Unknown' : '—';
              return (
                <button key={s.slot} onClick={() => setOpenSlot(s.slot)} style={glanceCard(flagged)}>
                  {/* header row: sprite + name + confidence badge — mirror mock TEAM GLANCE */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
                    <span style={spriteTile}><Sprite dex={e.speciesId} size={31} /></span>
                    <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    </span>
                    <span style={confBadge(flagged)}>
                      <Icon name={flagged ? 'alert-triangle' : 'check'} size={9} color={flagged ? 'var(--field)' : 'var(--safe)'} />
                    </span>
                  </span>
                  {/* four move rows — 2-col grid; red-ish flag on an illegal move (flags.illegalMoves) */}
                  <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', width: '100%' }}>
                    {e.moves.map((mv, mi) => (
                      <span key={mi} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, fontSize: 9, fontWeight: 600, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mv != null ? movesById.get(mv)?.nameEn ?? '—' : '—'}
                        {flags.illegalMoves.includes(mi) && <Icon name="alert-triangle" size={8} color="var(--field)" />}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <ArenaSaveBar hasSpecies={hasSpecies} vocab={vocab} onCancel={onCancel} onSave={handleSave} />
      </div>
    );
  }
```

- [ ] **Step 3: Render the per-mon detail (candidate band + two columns)**

For `openSlot != null`, render the fix header (back → `setOpenSlot(null)`), the species candidate band when the slot has a species conflict, then two scrolling columns. Reuse the existing field editors (`<select>`/`<input>`/`<input type=number>`) so editing keeps working; paint amber/red rings from `SlotFlags` + the per-field `confident`/`consistent` flags. Follow the mock's VARIANT: INLINE block for spacing.

```tsx
  const s = merged.slots[openSlot];
  const e = edits[openSlot] ?? toEditable(s);
  const flags = deriveSlotFlags(s, vocab);
  const speciesConflict = flags.speciesUncertain || flags.speciesDisagreement || flags.illegalMoves.length > 0 || flags.badAbility;
  const speciesEdited = e.speciesId !== s.species[0]?.id;
  const learnset = e.speciesId != null ? vocab?.movesFor(e.speciesId) ?? [] : [];
  const abilityOptions = e.speciesId != null ? vocab?.abilitiesFor(e.speciesId) ?? [] : [];
  const openName = e.speciesId != null ? basesById.get(e.speciesId)?.nameEn ?? 'Unknown' : '—';

  // Evidence sentences from flags (English, derivable).
  const evidence: string[] = [];
  flags.illegalMoves.forEach((mi) => { const nm = e.moves[mi] != null ? movesById.get(e.moves[mi]!)?.nameEn : null; if (nm) evidence.push(`${nm} isn't in ${openName}'s learnset.`); });
  if (flags.badAbility && s.ability.value) evidence.push(`${s.ability.value} isn't a ${openName} ability.`);
  if (flags.speciesDisagreement) evidence.push('The two screenshots read different species.');

  return (
    <div style={box}>
      {/* fix header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--line-1)' }}>
        <button onClick={() => setOpenSlot(null)} aria-label="Back to team" style={backBtn}><Icon name="chevron-right" size={16} color="var(--ink-2)" style={{ transform: 'scaleX(-1)' }} /></button>
        <span style={spriteTile}><Sprite dex={e.speciesId} size={31} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 700, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openName}</div>
        </div>
      </div>

      {/* species candidate band OR resolved banner */}
      {speciesConflict && !speciesEdited ? (
        <div style={{ flex: 'none', padding: '8px 16px 9px', background: 'var(--field-soft)', borderBottom: '1px solid var(--field-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' }}>
            <Icon name="alert-triangle" size={13} color="var(--field)" />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-1)' }}>Is this right?</span>
            <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{evidence[0]}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {s.species.slice(0, 3).map((c) => (
              <button key={c.id} onClick={() => pickSpecies(openSlot, c.id)} style={candTile(e.speciesId === c.id)}>
                <span style={spriteTile}><Sprite dex={c.id} size={30} /></span>
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap' }}>{basesById.get(c.id)?.nameEn}</span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: 'var(--ink-4)' }}>{Math.round(c.score * 100)}%</span>
                </span>
              </button>
            ))}
            <button onClick={() => setPickerOpen((v) => !v)} style={btnGhost}>{pickerOpen ? 'Close' : 'Choose Pokémon'}</button>
          </div>
          {pickerOpen && <div style={{ marginTop: 8 }}><PokemonImagePicker pokemonList={pokemonList} selectedId={e.speciesId} onSelect={(id) => pickSpecies(openSlot, id)} /></div>}
        </div>
      ) : speciesEdited ? (
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 16px', background: 'var(--safe-soft)', borderBottom: '1px solid var(--safe-line)' }}>
          <Icon name="check-circle-2" size={13} color="var(--safe)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--safe)' }}>{openName} · re-derived</span>
        </div>
      ) : null}

      {/* two columns: left moves/ability/item — right nature + stat->SP */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{ width: '47%', flex: 'none', overflowY: 'auto', borderRight: '1px solid var(--line-1)', padding: '11px 14px', scrollbarWidth: 'none' }}>
          {/* Item input (amber ring on !confident || ambiguousItem), Ability select (amber on !confident || badAbility),
              4 Move selects from learnset (amber on !confident, red on illegalMoves). Reuse PlayerScanPanel's control markup,
              swapping Tailwind classes for the inline DS-token styles in this file. */}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '11px 15px', scrollbarWidth: 'none' }}>
          {/* Nature select (amber on !confident), then 6 rows: label badge + read value + arrow + SP number input
              (red ring when inconsistentSp.includes(i)). Reuse PlayerScanPanel's stat-row markup with DS-token styles. */}
        </div>
      </div>
      <ArenaSaveBar hasSpecies={hasSpecies} vocab={vocab} onCancel={onCancel} onSave={handleSave} />
    </div>
  );
```

- [ ] **Step 4: Add the small style constants + `ArenaSaveBar`**

Add these near the top of the file (module scope) and the sub-component at the bottom. Reproduce remaining exact paddings/sizes from the mock:

```tsx
const btnAccent: React.CSSProperties = { padding: '6px 12px', fontSize: 12, borderRadius: 'var(--r-sm)', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '6px 12px', fontSize: 12, borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--ink-2)', border: '1px solid var(--line-2)', cursor: 'pointer' };
const backBtn: React.CSSProperties = { width: 30, height: 30, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 'var(--r-sm)', background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--ink-2)', cursor: 'pointer' };
const spriteTile: React.CSSProperties = { width: 36, height: 36, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--surface-inset)', borderRadius: 8, overflow: 'hidden' };
const glanceCard = (flagged: boolean): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', gap: 7, padding: 10, borderRadius: 'var(--r-md)', textAlign: 'left', cursor: 'pointer', background: 'var(--surface-card)', border: `1px solid ${flagged ? 'var(--field-line)' : 'var(--line-1)'}`, minWidth: 0 });
const confBadge = (flagged: boolean): React.CSSProperties => ({ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, flex: 'none', borderRadius: 999, background: flagged ? 'var(--field-soft)' : 'var(--safe-soft)', border: `1px solid ${flagged ? 'var(--field-line)' : 'var(--safe-line)'}` });
const candTile = (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, padding: 7, borderRadius: 'var(--r-md)', background: 'var(--bg-page)', border: `1px solid ${active ? 'var(--accent)' : 'var(--line-2)'}`, cursor: 'pointer' });

const ArenaSaveBar: React.FC<{ hasSpecies: boolean; vocab: unknown; onCancel?: () => void; onSave: () => void }> = ({ hasSpecies, vocab, onCancel, onSave }) => (
  <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line-1)', background: 'var(--surface-sticky)' }}>
    {onCancel && <button onClick={onCancel} style={btnGhost}>Cancel</button>}
    <button onClick={onSave} disabled={!hasSpecies || !vocab} style={{ padding: '8px 16px', borderRadius: 'var(--r-sm)', background: 'var(--safe-soft)', color: 'var(--safe)', border: '1px solid var(--safe-line)', fontWeight: 700, cursor: 'pointer', opacity: !hasSpecies || !vocab ? 0.45 : 1 }}>Save team</button>
  </div>
);
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. (No unit test — Task 3 is verified in-app at Task 5.)

- [ ] **Step 6: Commit**

```bash
git add src/features/scan/ArenaPlayerScanReview.tsx
git commit -m "feat(scan): ArenaPlayerScanReview — 9a fix-in-place landscape review"
```

---

## Task 4: Wire into the landscape new-team flow

**Files:**
- Modify: `src/features/teams/components/mobile/ArenaAddTeam.tsx`

**Interfaces:**
- Consumes: `ArenaPlayerScanReview` (Task 3).
- Produces: nothing new.

- [ ] **Step 1: Swap the component**

In `src/features/teams/components/mobile/ArenaAddTeam.tsx`:

1. Replace the import on line 12:

```ts
import { ArenaPlayerScanReview } from '@/features/scan/ArenaPlayerScanReview';
```

2. In the `method === 'scan'` branch (currently line 160-161), render:

```tsx
        {method === 'scan' ? (
          <ArenaPlayerScanReview pokemonList={pokemonList} moveList={moveList} onSave={onScanSave} />
        ) : (
```

(`PlayerScanPanel` is no longer imported here — its portrait usage via `PlayerScanModal` is untouched.)

- [ ] **Step 2: Type-check + existing add-team test**

Run: `npx tsc --noEmit && npx vitest run src/features/teams/components/mobile/arena-add-team.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/teams/components/mobile/ArenaAddTeam.tsx
git commit -m "feat(teams): landscape new-team scan uses ArenaPlayerScanReview"
```

---

## Task 5: In-app verification (golden misread → corrected save)

**Files:** none (verification only).

- [ ] **Step 1: Build/lint gate**

Run: `npx tsc --noEmit && npm run lint && npx vitest run src/features/scan`
Expected: all PASS.

- [ ] **Step 2: Drive the landscape flow (use the `/verify` skill or the `dev-preview` recipe)**

1. Start the dev server; open the app at a landscape Arena viewport (`mode === 'arena-landscape'` — landscape + `max-height:767px`).
2. Teams → New team → **Scan**. Add a golden **moves** screenshot and **stats** screenshot for a team where at least one species is misread (e.g. the Garchomp/Salamence golden from the scan fixtures).
3. **Expect:** glance shows six cards; the misread slot's badge is amber (⚠); an illegal move on it shows the small amber flag.
4. Open the amber card → the **species candidate band** appears with an evidence line ("… isn't in …'s learnset"); the ranked candidates are listed.
5. Pick the correct species → band collapses to green "✓ {name} · re-derived"; the left column's ability/moves and the right column's SP update (re-derived by `setSlotSpecies`).
6. **Save team** → confirm the saved team's member for that slot has the corrected species, ability, moves, and SP.

- [ ] **Step 3: Confirm portrait is unchanged**

At a portrait Arena viewport, Teams → add team → Scan still opens `PlayerScanModal` → `PlayerScanPanel` with its original per-slot list UI. No visual/behavioral change.

- [ ] **Step 4: Commit any fixups**

```bash
git add -A
git commit -m "fix(scan): fix-scan review polish from in-app verification"
```

---

## Self-Review

- **Spec coverage:** glance + badges → Task 3 Step 2; detail + candidate band + re-derive → Task 3 Step 3 (uses `setSlotSpecies`); derivable flags → Task 1 (`deriveSlotFlags`); shared edit glue + no portrait regression → Task 1 + Task 2; wiring → Task 4; verification → Task 5. English-only, landscape-only, DS-tokens, no scanner change → Global Constraints, honored per task.
- **Placeholder scan:** the only non-verbatim regions are the repetitive per-field markup in Task 3 Steps 3-4, explicitly delegated to the mock (`FixScan.dc.html variant="inline"`) with the exact tokens and the reusable control logic supplied — a design port's markup, not a logic gap.
- **Type consistency:** `EditableSlot`, `toEditable`, `applyEditsToSlots`, `deriveSlotFlags`, `SlotFlags`, `isSlotFlagged` are defined in Task 1 and consumed with the same signatures in Tasks 2-3. `ArenaPlayerScanReview` uses `PlayerScanPanelProps` (Task 3 Interfaces) matching the `PlayerScanPanel` contract Task 4 relies on.
