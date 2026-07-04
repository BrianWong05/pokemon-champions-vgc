# Pokémon Champions damage calculator — Spec 6 (decomposition #7): Auto-fill-then-confirm UX

Date: 2026-07-05
Status: draft for review (revised per user direction — start-empty + common spreads, no confidence colors in v1)

Slice #7 of the program decomposition (see Part A of
`docs/superpowers/specs/2026-06-28-champions-calc-core-correctness-design.md`). A Pokémon's
**hidden build fields** — SP spread, nature, ability, item — are never on screen and **cannot be
read by the scan** (confirmed with the user: same as moves). So the calc can't know them.

Rather than *guess* them, this slice makes the unknown build **fast to set**: a scanned Pokémon
starts with a **clean/empty build**, the user can **one-tap apply a common spread** (Max HB / Max
HD), and the calc **remembers the build per species** so re-scanning the same opponent re-uses what
the user set. (Confidence colour-coding from Part A is **deferred** — see Out of scope.)

---

## Goal & success criteria

**Goal:** setting an unknown opponent's build is one tap or a quick edit, and the calc remembers it
next time.

**Success criteria:**
1. A scanned Pokémon loads with a **clean build** — SP all 0, neutral nature (`Hardy`), the species'
   first ability, no item — **unless** a saved build exists for that species (then it pre-fills).
2. Two quick-preset controls, **Max HB** and **Max HD**, are available on each side's build panel;
   tapping one fills that side's **SP spread + nature** (leaving ability/item as-is).
3. Editing any build field (nature / ability / item / SP) **saves the whole build for that species**;
   the next scan of that species pre-fills it.
4. A per-side **"reset build"** clears the saved build for the current species and returns it to the
   clean default.
5. Damage results stay live throughout; manual (non-scan) species selection is unchanged.

---

## Context & constraints

- **The four build fields can't be read** — this slice does not attempt to. It only makes them fast
  to set (presets) and sticky (remembered).
- **No confidence colours in v1.** Deferred (Out of scope). The value of the feature here is the
  quick-presets + memory, not the colour coding.
- **Fields in scope:** `nature` (+ derived `boostedStat`/`hinderedStat`), `activeAbility`, `item`,
  and the six `sp*` values. **Moves are out** (unreadable and don't affect defender damage).
- **Trigger for pre-fill/memory:** the scan-load path (`handleLoadDefender` / `handleLoadAttacker`
  in `src/pages/DamageCalculator/index.tsx`). The **preset buttons** live in the build panel and
  work any time (scan or manual). Manual `PokemonSearchSelect` picks are otherwise unchanged.

---

## Common spreads (quick-presets)

Two generic, species-independent spreads the user can one-tap apply. Champions uses SP (66 total,
cap 32/stat); each maxes two stats at 32 (64 of 66) and applies a matching defensive nature:

| Preset | SP spread | Nature |
|--------|-----------|--------|
| **Max HB** (physically bulky) | 32 HP / 32 Def | `Bold` (+Def, −Atk) |
| **Max HD** (specially bulky) | 32 HP / 32 SpD | `Calm` (+SpD, −Atk) |

Applying a preset sets **only** the SP spread + nature (and the derived `boostedStat`/`hinderedStat`
via `getNatureStats`); it does **not** touch ability or item (those are species-specific, not part
of a generic spread). Presets are defined as data in one module so more can be added later without
code changes.

---

## Build resolution on scan-load

When a Pokémon is loaded from a scan into a side:
1. If a **saved build** exists for that species (from `build-store`) → apply it (SP + nature +
   ability + item).
2. Else → the **clean default**: SP all 0, `Hardy` nature, first ability, no item. (This already
   matches what selecting a species does today; the new part is the saved-build lookup.)

The user then optionally taps **Max HB / Max HD** or edits fields directly.

---

## Remember builds (per species)

- **Storage:** `localStorage` under `champvgc.savedBuilds`, a JSON map
  `{ [speciesName]: { nature, ability, item, sp: {hp,atk,def,spa,spd,spe} } }`.
- **On edit** (`SET_NATURE` / `SET_ACTIVE_ABILITY` / `SET_ITEM` / `SET_SP`, or applying a preset) on a
  **scan-loaded** side → upsert that side's current build under its species name.
- **Reset:** a per-side **"reset build"** control clears the species' saved build and re-applies the
  clean default.
- Keyed by **species name** (canonicalised — Megas/forms included) so a saved build applies whether
  the species is loaded as attacker or defender.

---

## UI

On each side's build panel (`PokemonPanel`), a compact row near the SP/nature controls:

```
   Build:  [ Max HB ]  [ Max HD ]        [ reset ]
```
- **Max HB / Max HD** — apply the spread + nature (Section "Common spreads").
- **reset** — clear the saved build for this species and return to the clean default.

No colour coding in v1. Buttons are plain, matching the existing panel button style.

---

## Architecture

- **Create `src/features/damage-calculator/utils/common-spreads.ts`** — the two presets as data:
  `COMMON_SPREADS: { id, label, sp, nature }[]` (Max HB, Max HD). Pure data.
- **Create `src/features/damage-calculator/utils/build-store.ts`** — `loadSavedBuild(species)`,
  `saveBuild(species, build)`, `clearBuild(species)` over `localStorage`. The only module touching
  storage; guards against `localStorage` being unavailable.
- **Reducer (`useCalculatorState.ts`):**
  - `APPLY_SPREAD` (payload: side + `{ sp, nature }`) — sets SP + nature + derived nature stats only.
    (A generic spread; distinct from the existing `APPLY_PRESET`, which also sets ability/item.)
  - `APPLY_SAVED_BUILD` (payload: side + build) — sets SP + nature + ability + item from a saved
    build (used by scan-load when a saved build exists).
  - Keep the reducer **pure**: persistence (`saveBuild` / `clearBuild`) is done by the caller in
    `DamageCalculator` when it dispatches an edit/reset on a scan-loaded side.
- **Wiring (`DamageCalculator/index.tsx`):** `handleLoadDefender` / `handleLoadAttacker` look up
  `loadSavedBuild(species)`; if present dispatch `APPLY_SAVED_BUILD`, else leave the clean default.
  Preset buttons dispatch `APPLY_SPREAD` then `saveBuild`. Reset calls `clearBuild` + resets.
- **UI:** a small `BuildPresets` control (buttons) rendered by `PokemonPanel`.
- Track a per-side **"loaded from scan"** flag so the save-on-edit only fires for scanned sides (not
  when you're manually building your own team).

---

## Out of scope (deferred / not this slice)

- **Confidence colour-coding** (green/amber/red) — deferred; revisit after this ships if wanted.
- **Species-specific auto-apply** from `POKEMON_PRESETS` — not used here; the user preferred a clean
  start + generic spreads.
- More than two common spreads; offensive spreads; per-field reset; cross-device sync; moves;
  companion-camera (slice #6); anything touching the native scan.

---

## Testing

- **`common-spreads.test.ts`** — Max HB / Max HD have the expected SP + nature; SP within the 32 cap.
- **`build-store.test.ts`** — save/load/clear round-trip against a mocked `localStorage`; missing
  species returns null; storage-unavailable is handled.
- **Reducer tests** — `APPLY_SPREAD` sets SP + nature (+ derived stats) and leaves ability/item;
  `APPLY_SAVED_BUILD` sets all four; neither disturbs the other side.
- **Wiring test (light)** — scan-load with a saved build pre-fills it; without one, clean default.
- Existing calc/scan tests stay green (manual selection + damage results unchanged).

---

## Risks / open questions

- **Species-name canonicalisation:** saved-build keys and the loaded species name must match across
  Megas/forms. Normalise on one canonical name; verify Mega/form names during implementation.
- **Nature model:** `Bold`/`Calm` must exist in `pokemon-natures` and map to the right
  boosted/hindered stats via `getNatureStats`; verify during implementation.
- **Save trigger scope:** only scan-loaded sides remember edits (a "loaded from scan" flag). Confirm
  this doesn't surprise users who edit a manually-picked mon (by design, manual picks don't persist).
