# Landscape Fix-Scan (9a "Fix in place") — Design

**Date:** 2026-07-13
**Status:** Approved (brainstorm)

## Overview

Port screen **9a "Fix in place"** from the `Landscape Calculator.dc.html` canvas (Claude Design project `Pokémon Champion Damage Calculator`, component `FixScan.dc.html`, `variant="inline"`) into the landscape **player team import** flow.

The two-screenshot player import (moves&item + stats&nature) can misclassify a Pokémon's **species**, and a wrong species silently corrupts everything derived from it — SP, move legality, ability, nature. 9a surfaces that: the review opens on a **team glance** (all six mons with a confidence badge), the misread one is amber, and tapping it opens a **single-mon detail** with a **species candidate band**. Picking the right candidate re-derives the slot and clears the flags.

The recognition engine already exists (`usePlayerTeamScan` + `mergePlayerScan` + `setSlotSpecies`). This is an **information-architecture + landscape-styling** change on top of that engine, plus a pure "why is this flagged" derivation from data we already have.

## Scope decisions (locked in brainstorm)

- **Landscape only.** Replaces `PlayerScanPanel` inside `ArenaAddTeam`'s `method='scan'` branch. The mock has no `FixScanPortrait`; portrait (`PlayerScanModal` → `PlayerScanPanel`) is untouched.
- **English-only.** Matches the current scan review (hardcoded English strings). No locale mechanism is added. The mock's ja / zh-Hant / zh-Hans strings and language toggle are out of scope.
- **Derivable conflict signals only.** Flags come from data already in the merged scan + vocab. Two mock features that require scanner-internal changes are **out of scope**: the ability⇒species cross-inference *sentence*, and the ambiguous **Atk-digit segmented picker (200/208)** (needs `statDigits`/`mergePlayerScan` to surface alternate digit reads). We keep the editable SP field for those instead.

## Goals

- Landscape scan review opens on a six-card **team glance**; each card shows a green ✓ / amber ⚠ confidence badge and its four move rows. Amber = the slot has any conflict flag.
- Tapping a card opens a **per-mon detail** (in-body back to glance): species candidate band when flagged, then two columns — left = item · ability · moves, right = nature + stat→SP rows.
- Picking a species candidate re-derives the slot (existing `setSlotSpecies`) and flips the flag to a green "resolved · re-derived" banner.
- Every field stays editable exactly as today; **Save team** is unchanged.
- Built on the Arena design system tokens (flat navy, one accent, green/red/amber semantics) to match the mock.

## Non-goals

- Portrait redesign; any change to `PlayerScanModal` / `PlayerScanPanel`'s UI.
- Multi-language UI.
- New scanner capabilities (alternate digit reads, ability⇒species inference sentence).
- Changes to the opponent scan / roster-confirm flows.

## Where it plugs in

`src/pages/Teams/index.tsx:269-271` renders `ArenaAddTeam` **only** when `mode === 'arena-landscape'`. Inside `ArenaAddTeam`, `method === 'scan'` renders `<PlayerScanPanel …>` (`ArenaAddTeam.tsx:160-161`). We render `<ArenaPlayerScanReview …>` there instead. `ArenaShell` already supplies the NavRail and `ArenaAddTeam` already supplies the header (back + team-name + Paste/Scan segments), so the new component renders **only the scan body**: capture chips → glance → detail. Its glance↔detail back button is in-body and distinct from `ArenaAddTeam`'s back (which exits to Teams).

## Architecture — files

### 1. NEW `src/features/scan/playerScanFlags.ts` (pure)

Extracted-and-shared logic (no behavior change), plus the new derivation:

- `interface EditableSlot`, `toEditable(slot): EditableSlot` — **moved verbatim** from `PlayerScanPanel`.
- `applyEditsToSlots(merged, edits): MergedPlayerScan` — **extracted verbatim** from `PlayerScanPanel.handleSave` (the `merged.slots.map(...)` block, lines 127-140). Both panels build save-configs via `buildConfigs(applyEditsToSlots(merged, edits), …)`.
- `deriveSlotFlags(slot: PlayerSlot, vocab: PlayerScanVocab): SlotFlags` — the new pure "why flagged" derivation.

```ts
interface SlotFlags {
  speciesUncertain: boolean;      // species[0].score < 0.5  (same threshold PlayerScanPanel uses today)
  speciesDisagreement: boolean;   // warnings includes 'species disagreement between moves and stats screens'
  illegalMoves: number[];         // move indices whose value ∉ vocab.movesFor(species[0].id)
  badAbility: boolean;            // ability.value != null && ∉ vocab.abilitiesFor(species[0].id) keys
  ambiguousItem: boolean;         // item.options[0].score - item.options[1].score < 0.08
  inconsistentSp: number[];       // stat indices where statReads[i] && !statReads[i].consistent
}
const isFlagged = (f: SlotFlags) =>
  f.speciesUncertain || f.speciesDisagreement || f.illegalMoves.length > 0 ||
  f.badAbility || f.ambiguousItem || f.inconsistentSp.length > 0;
```

All inputs already exist on `PlayerSlot` / `PlayerScanVocab`. No scanner changes.

### 2. NEW `src/features/scan/ArenaPlayerScanReview.tsx`

Same props contract as `PlayerScanPanel` (`pokemonList`, `moveList`, `onSave`, `onCancel?`, `active?`, `deps?`). Consumes `usePlayerTeamScan` and owns its own `edits` state (via the shared `toEditable` / `applyEditsToSlots`) and a `openSlot: number | null` navigation state.

Three view states inside the scan body:

- **Capture chips** (no merged data yet): the two screenshot chips (moves&item / stats&nature) with Add screenshot / Take photo / Crop & retry — same capture calls as `PlayerScanPanel` (`filePickerSource` / `cameraSource` / `CropStep`).
- **Team glance** (`openSlot == null`, merged present): 3×2 grid. Each card = sprite · name · confidence badge (`deriveSlotFlags` → amber ⚠ / green ✓) · four move rows (dot + name, amber icon on an illegal move) · foot line. `onClick` sets `openSlot`.
- **Detail** (`openSlot != null`): in-body header (chevron-left back to glance, sprite, name, screen-source pills). If the slot is flagged with a species conflict, the **species candidate band** renders on top:
  - Heading "Is this right?" with a short **evidence list** built from flags: illegal move → "*{move}* isn't in {species}'s learnset"; bad ability → "*{ability}* isn't a {species} ability"; disagreement → "the two screenshots read different species".
  - Candidate **tiles** from `slot.species` (already ranked): sprite · name · score%. Click → `setSlotSpecies(slot, id)` + drop that slot's local edits (same as `PlayerScanPanel.pickSpecies`), collapsing the band into a green "✓ {species} · re-derived" banner with a "Change" link to reopen.
  - A "Choose Pokémon" affordance opens the existing `PokemonImagePicker` for the free-text correction case.
  - Two-column body reusing today's editors: **left** = item (with an ambiguous-item swap chip when `ambiguousItem`, swapping to `item.options[1]`), ability (`<select>` from `abilitiesFor`, amber ring when `!confident` or `badAbility`), 4 move `<select>`s (from learnset, amber ring on `!confident`, red flag on illegal); **right** = nature (`<select>`, amber ring when `!confident`) + 6 stat→SP rows (numeric SP input, red ring when `!consistent`).

Styling uses Arena DS tokens only (`--field`/`--field-soft`/`--field-line` amber, `--safe*` green, `--surface-inset`, `--line-1/2`, `--r-sm/md/pill`, `--ink-1..4`, `--font-display/ui/mono`) — all confirmed present in `src/design-system/arena/tokens.css`. Lucide-equivalent icons via the existing `Icon` atom.

### 3. EDIT `src/features/scan/PlayerScanPanel.tsx`

Replace its local `EditableSlot` / `toEditable` and the `handleSave` mapping block with imports from `playerScanFlags.ts` (`toEditable`, `applyEditsToSlots`). Behavior-identical; portrait UI unchanged. Removes the duplication risk on the money path (edit → correct config).

### 4. EDIT `src/features/teams/components/mobile/ArenaAddTeam.tsx`

In the `method === 'scan'` branch, render `<ArenaPlayerScanReview … onSave={onScanSave} />` instead of `<PlayerScanPanel …>`. One-line swap; the paste/showdown path and header are untouched.

## Data reuse (what already works)

- `usePlayerTeamScan` returns ranked `species` candidates, per-field `confident` flags, cross-screen `warnings`, and **`setSlotSpecies`, which already re-scans the moves panel text with the pinned species and bumps `version` so `merged` recomputes** — SP, ability, item, moves and nature all re-derive. The candidate-band → re-derive behavior is wiring, not new logic.
- Per-field confidence rings and the `<0.5` species-uncertainty highlight already exist in `PlayerScanPanel`; `deriveSlotFlags` generalizes them into glance badges + detail evidence.

## Verification

- **Unit** `src/features/scan/playerScanFlags.test.ts`:
  - `applyEditsToSlots` — a species edit yields `species: [{id, score: 1}]` and threads ability/item/moves/sp/nature through; SP edit maps to `statReads[i].sp`.
  - `deriveSlotFlags` — fires `illegalMoves` for a move outside the learnset, `badAbility` for an off-species ability, `ambiguousItem` for near-tied item options, `inconsistentSp` for an inconsistent stat row, `speciesDisagreement` from the warning; a clean slot returns all-false / empty.
- **In-app** (`/verify`): drive the landscape new-team scan (`Teams` at `arena-landscape`, New team → Scan) with a golden moves+stats pair where the species is misread → glance shows the amber slot → open it → candidate band lists the correct species with evidence → pick it → badge greens and SP/ability re-derive → Save produces the corrected `PokemonConfig`.

## Out of scope / follow-ups

- Ambiguous Atk-digit segmented picker and the ability⇒species inference sentence (need `statDigits`/`mergePlayerScan` to expose alternate digit reads and a reverse ability→species index).
- 4-language UI.
- Portrait 9a variant (none in the mock).
