# Calculator — full design fidelity across 1a–1d

**Date:** 2026-07-08
**Status:** Draft — awaiting user review
**Reference design:** Claude Design project "Landscape Calculator" (`6824e3f6-e49b-45fd-8833-c080661e7dd1`), canvas `Landscape Calculator.dc.html` → **Turn 1**, children `ArenaCalc.dc.html` (variants `full`/`collapsed`/`roomy` = 1a/1b/1c) and `ArenaCalcPortrait.dc.html` (1d), on the Arena VGC Design System (`f20e187b`). The 1a source was diffed line-by-line against the local implementation (decoded design at `scratchpad/ArenaCalc.design.html`).

## Context: this is sub-project A of the whole canvas

| | Sub-project | Status |
|---|---|---|
| **A** | **Calculator — Turn 1 (1a landscape full, 1b rails, 1c iPad, 1d portrait)** | **this spec** |
| B | Speed-tiers landscape | later |
| C | Teams landscape (list + detail + AddTeam + review-scan) | later |
| D | Opponent-scan landscape | later |
| E | Portrait parity for the other tabs | later |

## Problem

Two of the four Turn-1 forms are missing (1b collapsible rails, 1c iPad), and
**both existing forms are behind their design**:

- **1a landscape** (`ArenaCalculatorLandscape`) omits: the computed-stat
  identity card, move category/base-power, scenario KO-verdict badges, the
  redesigned speed view, inline HP editing, and per-side condition chips.
- **1d portrait** (`ArenaCalculator`) omits: the Damage/Speed toggle + speed
  view, per-move-% move list, collapsible field conditions, and a HUD roll bar.
- **1c** is unreachable: `useViewportMode` routes any landscape viewport taller
  than 767px to the desktop layout, so iPads never get the HUD.

## Goal

Bring all four Turn-1 screens to the design as one coherent calculator, sharing
the read-out building blocks. **No calculator-engine changes** beyond a trivial
Trick Room flag — every gap is UI over existing state/`@smogon/calc` support.

## Decisions made during brainstorm

| Question | Decision |
|---|---|
| Scope | Whole calculator (Turn 1, 1a–1d) — first of the whole-canvas decomposition |
| 1a/1b/1c one component? | Yes — one adaptive `ArenaCalculatorLandscape`; the design's `variant` becomes runtime behavior |
| Default rail state (1b) | **Expanded**; each side gets a chevron to collapse to a rail |
| iPad gating (1c) | **Touch-guarded tablet tier** — `(orientation: landscape) and (max-height: 1024px) and (pointer: coarse)` |
| 1d portrait card model | **Additive parity — keep inline SP editing.** Add the toggle/speed view, move-% list, collapsible fields, roll bar; do NOT convert the SP grid to read-only sheet-edited boxes |
| 1a-fidelity gaps to include | **All UI gaps: computed-stat card, move category/BP, scenario KO badges, speed redesign, inline HP editing, per-side condition chips** (#1–6) |
| Deferred (feature-blocked) | **Mega-evolve/revert** (no mega mechanic) and **Record-result** (no feature). Local's center "Advanced" button is kept in place of the design's Record-result footer |

## Part A — Shared read-out upgrades (all four screens)

Two presentational pieces are identical in landscape and portrait. Extract them
so both trees share one copy, and build the design's richer content into them:

- **`ArenaMoveList`** — per-move row = type badge · name · **category mark
  (Ph/Sp)** · **base power** · `minPercent–maxPercent%`; active row
  highlighted; tap sets active; pencil opens the move picker. (Design lines
  622–634.) `moveList` already carries `damageClassId` (category) and `power`.
  Used by landscape attacker panel and portrait attacker card.
- **`ArenaSpeedCompareView`** — your side: **selectable Actual/Scarf/Tailwind
  mode buttons** (the picked mode drives the opponent-tier verdicts) + a Spe
  rank stepper; opponent side: rank stepper + tier rows with Faster/Tie/Outsped;
  a **live computed SP formula** line (e.g. `153 = floor((101 + 20 + 32) × 1.0)`)
  replacing today's static template. Layout is **2-column** in landscape,
  **stacked** in portrait (a `layout` prop). Built on the existing
  `buildSpeedCompare`; extend it to expose the picked-mode effective speed.

## Part B — Landscape (1a / 1b / 1c) — `ArenaCalculatorLandscape.tsx`

### B1. Viewport gating (1c) — `useViewportMode.ts`
Add a second landscape query; `arena-landscape` fires if **either** matches. The
`ViewportMode` type is unchanged, so no page needs editing.
```
PHONE_LANDSCAPE  = (orientation: landscape) and (max-height: 767px)                       // unchanged
TABLET_LANDSCAPE = (orientation: landscape) and (max-height: 1024px) and (pointer: coarse) // new
```
Phone tier keeps no pointer guard (existing behavior/tests unchanged); only the
tablet tier is touch-guarded (height alone can't separate a 1366×1024 iPad Pro
from a 1280×800 laptop; `pointer: coarse` can).

### B2. Collapsible rails (1b)
New `collapsed: { p1, p2 }` state, default expanded. Per side render
`collapsed[side] ? <Rail/> : <Panel/>`. **`Rail` (88px)**: micro label · sprite
tile · short name · attacker → active-move type badge + name; defender → HP% ·
item · chevron-to-expand. Expanded `Panel` gets a chevron-to-collapse in its
header.

### B3. Responsive width + roomy center (1c)
Expanded panel width: `clamp(228px, 25%, 300px)` (was fixed 240) → becomes the
roomy iPad look automatically. Center content capped `maxWidth: 520; margin: 0
auto`. Rail stays 88px.

### B4. 1a fidelity (the panels + center)
- **#1 Computed-stat identity card** (both sides) — a bordered card: sprite
  (64px, ring/tone) · name · type pills · six computed stats in a 2-col × 3-row
  grid (H/C · A/D · B/S), via existing `calculateStat`/`calculateHP`. Extract as
  `ArenaStatCard`. Replaces today's bare `Identity` row.
- **#2 Move category + base power** — via shared `ArenaMoveList` (Part A).
- **#3 Scenario KO-verdict badges** — each scenario row gains a `Badge` (tone =
  safe/field/danger) showing the KO verdict (e.g. `乱1 62.5%` / `確2`). Requires
  `useDamageScenarios` to also return each scenario's KO chance (the underlying
  `@smogon/calc` `Result` already computes `kochance`; surface it).
- **#4 Speed view redesign** — the 2-column `ArenaSpeedCompareView` (Part A).
- **#5 Inline HP editing (defender)** — replace the read-only HP bar with a
  draggable bar (`ew-resize` + wheel) + a `% HP` number input + −/+ steppers,
  all dispatching `SET_HP_PERCENT`.
- **#6 Per-side condition chips** — a "YOUR SIDE" chip group on the attacker
  (Tailwind, Helping Hand) and an "OPP SIDE" group on the defender (Reflect,
  Light Screen), each a `Chip` dispatching the existing
  `TOGGLE_SIDE_EFFECT`. **State + engine already support these** (`SideState`
  has the flags; `mapToSmogonField` wires them). Extract as
  `ArenaSideConditions`.
- **Trick Room** — the one net-new flag: add `isTrickRoom` to `CalcState` + a
  toggle action + map to `@smogon/calc` `Field.isTrickRoom`; surface it as a
  field chip (center "battlefield" row) and let it flip the speed-compare order.
- **Defender panel restructure** to match the design order: settings-icon in the
  header, "Revealed" roster strip with **unknown `?` placeholder tiles** (extend
  `OpponentRosterChips` / the `defenderExtra` slot), scan button near the top,
  stat card, HP editor, ability/item, 4-box tune grid (defensive stat matching
  the active move category), OPP-SIDE chips. Attacker mirrors (team strip, stat
  card, moves, ability/item, tune grid, YOUR-SIDE chips).

## Part C — Portrait (1d) — additive — `ArenaCalculator.tsx` + parts

Keep today's structure (pinned HUD, two `ArenaMonCard`s, field conditions, SP
footnote, **inline SP grid**). Add:
- **Damage/Speed toggle** below the HUD → new `view` state; Speed view renders
  the shared `ArenaSpeedCompareView` (stacked layout).
- **Per-move-% move list** on the attacker card via shared `ArenaMoveList`
  (brings category/BP too); defender keeps its single Move row.
- **Collapsible field conditions** — `ArenaFieldConditions` gets a chevron
  header (default open).
- **HUD roll bar** in `ArenaHud`.
- Portrait **keeps the inline SP grid**; it does **not** get the computed-stat
  card, per-side chips, scenario rows, or inline HP editor (those are
  landscape-only, per the 1d design + the additive-parity decision).

## Accepted edges

- **iPad → other tabs show `RotateToPortrait`** until sub-projects B/C land
  (already true on iPad *mini* today; the tablet tier just makes it consistent).
- **Collapsed defender hides "Scan opponent"** until expanded (default expanded).
- **iPad + trackpad → desktop layout** (`pointer: fine`).
- **Mega button / Record-result** are omitted (no backing feature); the center
  keeps its "Advanced" button rather than the design's Record-result footer.

## Testing

TDD, vitest:
- `useViewportMode.test.ts` — tablet-tier cases (1180×820 coarse → landscape,
  1366×1024 coarse → landscape, **1280×800 fine → desktop**), extend the
  `matchMedia` mock for `pointer`/`max-height:1024`.
- `ArenaMoveList` / `ArenaSpeedCompareView` / `ArenaStatCard` /
  `ArenaSideConditions` — light render tests (category/BP shown; mode buttons
  switch the driving speed; six stats render; chips dispatch `TOGGLE_SIDE_EFFECT`).
- `useDamageScenarios.test.ts` — extend for the new KO-chance field per scenario.
- `arena-calculator-landscape.test.tsx` — collapse renders the rail; stat card,
  scenario badges, per-side chips, HP editor present.
- Portrait test — Damage/Speed toggle → speed view; attacker move list; fields
  collapse/expand.
- **Manual preview** — 852×393 (rails, all reads), 1180×820 (roomy), 375×812
  (portrait toggle/speed/move list/fields), desktop regression at 1280×800.

## Out of scope

- **Mega-evolve/revert** and **Record-result** (feature-blocked).
- Portrait computed-stat card / per-side chips / inline HP editor / scenarios
  (landscape-only per 1d).
- Sub-projects B–E; desktop template.

## File inventory

**New (shared components):** `ArenaMoveList.tsx`, `ArenaSpeedCompareView.tsx`,
`ArenaStatCard.tsx`, `ArenaSideConditions.tsx` (all under `.../mobile/`).

**Modified:**
- `src/hooks/useViewportMode.ts` (+test) — tablet tier.
- `.../mobile/ArenaCalculatorLandscape.tsx` (+test) — rails, `clamp` width,
  capped center, stat card, scenario badges, speed view, HP editor, per-side
  chips, defender restructure; consume shared components.
- `.../mobile/ArenaCalculator.tsx` — `view` state + Damage/Speed toggle + speed
  view.
- `.../mobile/ArenaMonCard.tsx` — attacker move list via `ArenaMoveList`.
- `.../mobile/ArenaHud.tsx` — roll bar.
- `.../mobile/ArenaFieldConditions.tsx` — collapsible header + Trick Room chip.
- `.../hooks/useDamageScenarios.ts` (+test) — expose per-scenario KO chance.
- `.../hooks/useCalculatorState.ts` — `isTrickRoom` flag + action.
- `.../utils/damage-calc.ts` — map `isTrickRoom` to `Field`.
- `.../scan/OpponentRosterChips.tsx` — unknown `?` placeholder tiles (defender
  strip).
