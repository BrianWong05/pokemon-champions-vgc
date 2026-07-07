# Landscape calculator (battle HUD) — design

**Date:** 2026-07-07
**Status:** Approved
**Reference design:** Claude Design project "Arena VGC Design System" (f20e187b-0c82-44ce-879c-8c25a14c2906), `ui_kits/arena-app/landscape.html` + `CalculatorLandscape.jsx` — the approved landscape mock.

## Problem

Pokémon Champions is played in landscape. Today the app has no orientation
handling at all: `useIsMobile` is `(max-width: 767px)` only, so a phone rotated
to landscape (e.g. 800×360) falls out of the mobile branch and renders the
**desktop** layout crammed into 360px of height. Mid-battle use — the app's
core moment — is exactly when the layout is worst.

## Goal

Port the approved landscape mock into the app: a three-panel battle HUD
(attacker | result | defender) shown when a phone- or iPad-mini-sized viewport
is in landscape orientation, at full mock fidelity (per-move damage in the move
list, Damage ↔ Speed center-column toggle, scenario rows). Calculator only;
other tabs show a "Rotate to portrait" placeholder in landscape.

## Decisions made during brainstorm

| Question | Decision |
|---|---|
| Which work stream | Landscape calculator in-app (before finishing player-team-scan tasks or Android floating capture) |
| Screens in scope | Calculator only; Teams / EV-SP / Speed tiers get a rotate-to-portrait placeholder |
| Trigger | Size-based: landscape orientation up to iPad-mini size; desktop unaffected |
| V1 fidelity | Full mock: three panels + per-move % + Speed compare mode + scenario rows |
| Architecture | Approach A: third presentational tree beside the existing portrait `ArenaCalculator`, gated by a viewport-mode hook; state stays shared at page level |

## 1. Viewport gating

New hook `useViewportMode(): 'desktop' | 'arena' | 'arena-landscape'` in
`src/hooks/useViewportMode.ts`, following the `matchMedia` subscribe pattern of
`useIsMobile.ts`:

- `arena-landscape` = `(orientation: landscape) and (max-height: 767px)`.
  Covers phones (≤ ~460px tall in landscape) and iPad mini (744px tall in
  landscape). iPad Air (820px tall) and larger stay desktop. Takes precedence
  over the portrait check.
- `arena` = current `(max-width: 767px)` behavior (portrait mobile).
- `desktop` = everything else.

Migrate all six `useIsMobile` call sites to the new hook:
`src/components/templates/Layout.tsx`, `src/pages/DamageCalculator/index.tsx`,
`src/pages/Teams/index.tsx`, `src/pages/TeamDetail/index.tsx`,
`src/pages/EvSpConverter/index.tsx`, `src/pages/SpeedTierList/index.tsx`.
`useIsMobile` is then unused and is deleted along with its test (superseded by
`useViewportMode` tests).

Per-mode rendering:

| Mode | Layout shell | Calculator page | Other 4 pages |
|---|---|---|---|
| `desktop` | desktop header/footer | desktop template | desktop UIs |
| `arena` | `ArenaShell` (app bar + tab bar) | `ArenaCalculator` | existing Arena mobile UIs |
| `arena-landscape` | `ArenaShell` rail variant | `ArenaCalculatorLandscape` | `RotateToPortrait` placeholder |

**Accepted edge:** a deliberately short desktop browser window (e.g. 1300×700)
also gets the battle HUD. Height + orientation is the simple, testable rule;
no pointer/touch sniffing.

## 2. Shell: nav rail variant

`ArenaShell` gains a landscape mode (single component, not a second shell — its
tab/route/title maps and RegPill menu are shell-agnostic and would otherwise be
duplicated):

- Outer flex flips to `row`.
- New `NavRail` component (~30 lines, `src/design-system/arena/NavRail.tsx`)
  reusing `ARENA_TABS` + `Icon`: app mark at top, four icon tabs (44px targets,
  active = accent + accent-soft fill), spacer, `ThemeToggle`, compact `RegPill`
  at the bottom. Width ~56px. `RegPill` gains a `compact` prop rendering only
  the short code (e.g. "M-B") so it fits the rail; menu behavior unchanged.
- **No AppBar in landscape** — the rail carries mark/theme/reg; all 360px of
  height goes to content.
- The RegPill menu re-anchors in landscape (current anchor math assumes the
  app bar): anchored to the rail's bottom-left edge instead. The `inset: 0`
  click-away scrim behavior is unchanged.

## 3. Landscape calculator tree

New `src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx`
rendered by `DamageCalculator/index.tsx` in `arena-landscape` mode, receiving
the **identical props** as portrait `ArenaCalculator`: `state`, `dispatch`,
`pokemonList`, `moveList`, `p1Results`, `p2Results`, `p1MaxHp`, `p2MaxHp`,
`actions`, `onApplySpread`, `onResetBuild`, `onOpenScan`,
`attackerExtra` (MyTeamChips), `defenderExtra` (OpponentRosterChips).
`ScanTeamModal` and `ToastNotification` remain page-level siblings.

Three independently scrolling panels (hidden scrollbars), per the mock:

- **Attacker (left, ~240px):** ATTACKER micro-label + "You" badge;
  `attackerExtra` chips; sprite/name/types identity; move list (4 slots, see
  §4); Ability + Item select rows; a 2×2 grid of read-only tune boxes — Nature
  / Rank / Atk SP / SpA SP — tapping any of them opens the Advanced sheet.
  Rank shows the attacker's offensive stage (Atk or SpA, whichever matches the
  active move's damage category).
- **Center (flex):** Damage ↔ Speed segmented toggle + swap-direction button;
  matchup line ("Moonblast · X vs Y"); damage view = % readout + KO verdict +
  roll band + scenario rows + field chips row; speed view = your effective
  speed + scarf/tailwind chips + rank stepper vs opponent tier list with
  Faster/Outsped/Tie badges; Advanced action at the bottom (rendered in both
  damage and speed views).
- **Defender (right, ~240px):** DEFENDER micro-label + "Opponent" badge;
  `defenderExtra` chips + scan button; identity; HP bar; Ability + Item rows;
  a 2×2+1 grid of read-only tune boxes — Nature / HP SP / Def SP / SpD SP /
  Rank — tapping any of them opens the Advanced sheet. Rank shows the
  defender's defensive stage (Def or SpD, matching the attacker's active move
  category).

Side identity: sprite rings + badges (accent = you, danger = opponent), flat
surfaces — never tinted panel backgrounds (design-system rule).

## 4. New capabilities

**Per-move damage % — zero new computation.** `useDamageCalc` already returns
`DamageResult` for all four move slots of each side every render. The move list
renders `p1Results[i].minPercent`–`maxPercent` (and KO-chance text on the
active row); tapping a row dispatches `activeMoveIndex`; a small edit
affordance per row opens `ArenaMovePickerSheet` to change the slot.

**Scenario rows — `useDamageScenarios`.** New hook, called only inside the
landscape component (portrait/desktop pay nothing). For the **active move
only**, re-calls the existing pure mappers `mapToSmogonPokemon` /
`mapToSmogonMove` / `mapToSmogonField` + `calculateSmogonDamage` with modified
inputs, inside one `useMemo` keyed like `useDamageCalc`:

1. **Crit** — `isCrit: true` (multi-hit count preserved).
2. **Opp. max bulk** — defender with `spHp: 32` and `spDef`/`spSpd`: 32 on the
   move's defending stat, plus matching +nature (`boostedStat` override).
   Spread shapes follow `common-spreads.ts` (SP cap 32/stat, 66 total).
3. **Opp. no SP** — defender spread zeroed, neutral nature.

~3 extra sub-millisecond calcs per render; the existing code already runs 8
synchronous calcs per keystroke, so this changes no performance regime. If
profiling ever shows jank, `useDeferredValue` is the escape hatch — not built
now.

**Speed compare.**
- Your effective speed: existing `calculateStat(baseSpe, spSpe, natureMult,
  stage)` (`damage-calc.ts:12`), then a new ~5-line
  `effectiveSpeed(speed, { scarf, tailwind })` util in
  `src/features/damage-calculator/utils/speed.ts` applying ×1.5 / ×2 with
  floors (no scarf/tailwind speed math exists in the app today). Scarf is
  inferred from `item === 'Choice Scarf'`; tailwind from `isTailwind` in state.
- Opponent tiers: existing (currently unused) `calculateSpeedStats(baseSpeed)`
  (`src/features/pokemon/utils/stats.ts:23`) → Max+ / Max / Uninvested rows,
  plus scarf variants of Max+ and Max; each adjusted by the defender's known
  rank stages and tailwind from state.
- Badges: compare your effective speed to each tier — `Faster` (safe), `Tie`
  (field), `Outsped` (danger).

## 5. Interactions — reuse

| Component | Reuse mode |
|---|---|
| `ArenaPokemonPicker`, `ArenaItemPicker` | Content-only (verified container-agnostic); hosted in a `Sheet` by the landscape tree, same pattern as portrait; ability/nature inline lists lifted from `ArenaCalculator`'s shared Sheet wiring (~15 lines) into a small shared helper both trees use |
| `ArenaMovePickerSheet`, `ArenaAdvancedSheet` | As-is (self-wrapped bottom sheets). At 360px viewport height the 78vh cap ≈ 281px — cramped but functional; **accepted for v1**. Side-docked sheets are a possible follow-up |
| `ScanTeamModal`, `ShowdownImportModal` | Unchanged, page-level |

Nits handled: pickers' `autoFocus` disabled in landscape (soft keyboard would
cover most of the viewport) via an `autoFocus?: boolean` prop defaulting true.

## 6. Error handling & edges

- **No species selected:** panels render placeholder identity (as portrait
  does); center column shows an em-dash readout — no crashes on `null` results
  (`p1Results` slots are nullable already).
- **Unknown opponent data:** Item "Unknown", nature "—" render as plain values;
  scenario and speed math treat missing SP as 0 (matches state defaults).
- **Orientation flip mid-edit:** calculator state (`state`/`dispatch`) lives at
  the page level and survives the flip. However, swapping between the
  portrait and landscape trees unmounts the outgoing tree, so any open Sheet
  closes and the landscape tree's own local UI state (direction swap toggle,
  damage/speed view toggle) resets to its defaults on remount. The page-level
  `ScanTeamModal` is unaffected and stays open across the flip.
- **Light theme:** all styling uses Arena tokens; `data-theme='light'` works
  without additional code.

## 7. Testing

TDD, matching repo convention (vitest):

- `useViewportMode.test.ts` — matchMedia mock (prior art:
  `useIsMobile.test.ts`); asserts mode per viewport: 375×812 → arena,
  800×360 → arena-landscape, 1133×744 → arena-landscape (iPad mini landscape),
  744×1133 → arena (iPad mini portrait, width ≤ 767), 1280×800 → desktop.
- `speed.test.ts` — `effectiveSpeed` floors and stacking (scarf, tailwind,
  both).
- `useDamageScenarios.test.ts` — crit range > base range; max-bulk range <
  base range; no-SP ≥ base when defender had investment; null move → null
  scenarios.
- `arena-calculator-landscape.test.tsx` — renders with sample state: three
  panels present, four move rows show percent ranges, tapping a row changes
  active move, mode toggle switches damage↔speed views.
- Manual preview verification at 800×360 and 1133×744, portrait and desktop
  regression check at 375×812 / 1280×800.

## Out of scope (this step)

- Landscape layouts for Teams / EV-SP / Speed tiers (placeholder only).
- Side-docked sheet variant for landscape.
- "Record result" battle logging (the mock's button is not wired to a feature
  that exists; omit the button until the feature exists).
- Android floating-capture integration (separate deferred work stream).
- Speed-ability multipliers (Swift Swim etc.) in the speed compare — matches
  the existing speed-tiers feature, which also ignores them.

## File inventory

New: `src/hooks/useViewportMode.ts` (+test),
`src/design-system/arena/NavRail.tsx`,
`src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx`
(+test), `src/features/damage-calculator/hooks/useDamageScenarios.ts` (+test),
`src/features/damage-calculator/utils/speed.ts` (+test),
`src/components/RotateToPortrait.tsx` (tiny, shared by 4 pages).

Modified: `Layout.tsx`, `ArenaShell.tsx` (rail variant + RegPill anchor),
`RegPill.tsx` (compact prop), `DamageCalculator/index.tsx`, `Teams/index.tsx`,
`TeamDetail/index.tsx`, `EvSpConverter/index.tsx`, `SpeedTierList/index.tsx`,
`ArenaPokemonPicker.tsx` / `ArenaItemPicker.tsx` (autoFocus prop),
`ArenaCalculator.tsx` (lift shared picker-sheet wiring).

Deleted: `src/hooks/useIsMobile.ts` + `useIsMobile.test.ts` (superseded).
