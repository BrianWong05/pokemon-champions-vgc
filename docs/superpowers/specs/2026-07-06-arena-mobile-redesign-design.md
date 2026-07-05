# Arena Mobile Redesign — Calculator + Shared Shell (Design Spec)

**Date:** 2026-07-06
**Status:** draft for review
**Scope:** Slice 1 of the Arena mobile redesign — the shared mobile shell + the Damage Calculator screen. Teams, EV·SP, and Speed-tier screens are follow-on slices.

---

## 1. Context & goal

The app currently renders one desktop-first, light layout for every viewport. On a phone the top nav overflows (`Layout.tsx` puts four links **plus** a Regulation `<select>` in a non-wrapping `flex` row) and the calculator is a wide `max-w-6xl` grid. The user plays VGC on a phone and wants a mobile experience that answers "do I KO / do I survive?" fast.

The visual direction already exists as a complete design system in Claude Design — **"Arena VGC Design System"** (`f20e187b-0c82-44ce-879c-8c25a14c2906`): dark competitive HUD, token CSS, ~21 React components, and a three-screen phone UI kit. **This system is the source of truth.** Our job is a faithful port into the React/Tailwind codebase, reconciled with the app's real (larger) feature set and offline Capacitor constraints — not a new visual identity.

> The DS readme states it was "built from a written product brief — no attached codebase or Figma." So its Calculator is a clean **subset**; the real app has ~3× the controls. Reconciling that gap is the substance of this spec.

**Success criteria**
- At mobile viewport width, the Calculator renders as the Arena screen (dark HUD, bottom tabs, sticky result) and matches the DS tokens/components/voice.
- Desktop (wide viewport) is **pixel-identical to today** — zero regression.
- All existing calculator behavior remains reachable on mobile (via the card + a bottom Sheet).
- Existing test suite stays green; calc reducer/logic untouched.

**Non-goals (this slice):** redesigning Teams / EV·SP / Speed screens; opponent-team scan flow; any change to `@smogon/calc` wiring, the SP stat model, or `useCalculatorState`.

---

## 2. Architecture

### 2.1 Trigger — viewport width
The Arena UI shows on **narrow viewports** (phone web *and* installed Android app); wide viewports keep the current light desktop layout. Consequence, accepted: narrowing a desktop browser flips it to Arena. No user toggle, no platform branching.

Add `src/hooks/useIsMobile.ts` — a `matchMedia('(max-width: 767px)')` hook (SSR-safe, listens for changes). `767px` = below Tailwind `md`, matching the existing `lg:`/`md:` desktop breakpoints.

### 2.2 Separate shell + template, shared state
Mobile and desktop differ **structurally** (bottom tabs vs top nav; sticky single-direction HUD vs dual-column results grid), not just in color. So we render **distinct presentational trees**, never a per-breakpoint restyle of one tree:

- **Shell:** `Layout.tsx` branches on `useIsMobile()`. Desktop → today's header (unchanged). Mobile → `ArenaShell` (sticky `AppBar` + scroll region + sticky bottom `TabBar`). The shell mounts on **all** mobile routes so the tab bar persists across navigation.
- **Calculator:** `pages/DamageCalculator/index.tsx` branches on `useIsMobile()` and renders either the existing `DamageCalculatorTemplate` (desktop) or the new `ArenaCalculator` (mobile). **Both consume the same `useCalculatorState` state + dispatch and the same computed `p1Results/p2Results`.** The reducer, actions, and calc logic are untouched → no behavioral regression risk.

Desktop code paths are not edited, only guarded by the branch — the smallest safe diff.

### 2.3 Interim inconsistency (accepted)
This slice restyles only the Calculator. Teams / EV·SP / Speed render their **existing** content inside the Arena shell (on the dark page background) until their own slices. Their light cards will contrast with the dark chrome — a documented, temporary state, resolved as slices 2–4 land. The tab bar navigates to them normally.

---

## 3. Porting the design system

Vendor the DS into the repo under `src/design-system/arena/` (tokens + adapted components) so it is the referenced source, adapted per the DS readme's own production notes:

| DS asset | Port |
|---|---|
| `tokens/*.css` (colors, typography, spacing, effects) | Copy into `src/design-system/arena/tokens.css`, imported once from `src/index.css`. Values verbatim (page `#0B0E14`, card `#151A23`, inset `#1F2636`, accent `#4F7DFF`, safe `#36C281` / danger `#F2566B` / field `#F2B53C`, 18 type colors; 4px scale; 44/56/64 sizing; radii; flat shadows). Exposed as CSS custom properties; components read them via `var(--…)` (works alongside Tailwind v4). |
| `tokens/fonts.css` (Google Fonts CDN) | **Do not** use the CDN (offline/Capacitor). Self-host via `@fontsource/space-grotesk`, `@fontsource/manrope`, `@fontsource/jetbrains-mono`; import the needed weights in `index.css`. Bind to `--font-display / --font-ui / --font-mono`. |
| Icons (Lucide CDN) | The DS calls Lucide a "stand-in… swap for a bespoke set." For this slice the shell + Calculator need ~8 glyphs (`chevron-right/up/down`, `calculator`, `users`, `sliders-horizontal`, `gauge`, `cloud-sun`). Inline them as a tiny local `Icon` set (no runtime dep). If later slices need many more, revisit `lucide-react`. |
| `Sprite` (PokéAPI CDN by dex) | Wrap the existing `PokemonImage` atom (local `images/pokemon/thumbnails/{id}.png`, PokéAPI fallback). Keep the DS `ring`/`tone`/`size` API; add `image-rendering: pixelated` if we want the pixel look. |
| `ItemIcon` (PokéAPI CDN by slug) | Wrap the existing `ItemImage` atom. |
| React components | Adapt each DS component (currently inline-styled JSX reading tokens) into `src/design-system/arena/` as typed `.tsx`, preserving the DS API. |

**Components needed this slice:** `Card`+`CardHeader`, `Badge`, `Chip`+`ChipGroup`, `Icon`, `Sprite`, `ItemIcon`, `TypeBadge`, `StatField`+`StatGrid`, `KOVerdict`, `AppBar`, `RegPill`, `TabBar`, `SelectRow`, `Toggle`, `Sheet`. (Deferred to later slices: `StatChip`, Teams/Speed-specific compositions.)

**Voice:** sentence case throughout (the DS forbids ALL CAPS except 11px micro-labels); terse and factual; numbers are the loudest thing on screen.

---

## 4. The mobile shell (`ArenaShell`)

Mirrors `ui_kits/arena-app/index.html`: `AppBar` (56px, sticky, translucent) at top; a single scroll region; `TabBar` (64px, sticky, four tabs) at bottom; a `Sheet` mount for overflow/detail.

- **AppBar:** title from the active route; right side = `RegPill` showing the current format (from `FormatContext`). Tapping the pill opens a **format Sheet** (list of `availableFormats`, calls `setFormat`) — replacing the desktop `<select>`.
- **TabBar** (`ARENA_TABS`): Calculator → `/`, Teams → `/teams`, EV·SP → `/ev-converter`, Speed → `/speed-tiers`. Active tab uses the accent; each is ≥44px; wires to `react-router` navigation. Includes `env(safe-area-inset-bottom)` padding.
- **Sheet:** bottom sheet over a scrim, driven by app state; integrate with the existing `useModalRegistry` so it participates in the app's modal/back handling. Used for the format picker, the per-mon Advanced controls, and the move picker.

---

## 5. The Calculator screen (`ArenaCalculator`)

Content inside the scroll region; the result HUD pins to the top. Reads `state` + `dispatch` from `useCalculatorState` and the computed results.

### 5.1 Result HUD — single direction (DS-faithful)
`position: sticky; top: 0` inside the scroll. Shows the **active direction only**: the attacker's active move → the defender.
- Matchup row: attacker `Sprite` (accent ring) → `chevron-right` → defender `Sprite` (danger ring) → move name + "Attacker vs Defender".
- Readout: big Space-Grotesk `min–max %` range + a sub-line ("`min–max dmg · N% chance to OHKO`") + `KOVerdict` (verdict text + confidence + tone) derived from the existing `koChanceText` on the active result.
- A **swap** affordance flips which side is attacker/defender (re-points the HUD at the other direction). The **active move** is chosen in the attacker card / move Sheet.
- This replaces today's dual-column both-directions `ResultsPanel` on mobile. (Desktop keeps the dual view.) The reverse direction and the full per-move breakdown are one tap away (swap / move Sheet), not gone.

### 5.2 Attacker & Defender `MonCard`s (clean core)
Per side, always visible:
- `CardHeader`: `Sprite` + species name + `TypeBadge`s. Defender also shows a **current-HP bar** (`state.p2.hpPercent`).
- `SelectRow`s: **Move** (active move; leading `TypeBadge`), **Ability**, **Item** (leading `ItemIcon`), **Nature**. Tapping a row opens the app's existing search/select surfaces (species/move/item/ability) presented in the mobile idiom.
- `StatGrid` of six `StatField`s — the custom **SP** values (HP/Atk/Def/SpA/SpD/Spe), `active` when > 0.
- One **"Advanced"** button → opens the per-mon Sheet (§5.4).

### 5.3 Field conditions
The DS collapsible `FieldChips` card → `ChipGroup`s wired to the calc's field state: **Weather** (None/Sun/Rain/Sandstorm/Snow), **Terrain** (None/Electric/Grassy/Misty/Psychic), **Target** (Single/Spread), **Auras** (Fairy/Dark/Break), and a **Gravity** `Toggle`. Chip rows scroll horizontally rather than overflow 360px. A faint SP-formula footnote (`--font-mono`) sits below, per the DS.

### 5.4 Overflow → bottom Sheet (DS-native)
Everything else the app supports opens in a `Sheet`, keeping the cards clean. Per-mon **Advanced** Sheet contains:
- Stat **stages** (−6…+6 per stat), **type override** (type1/type2 + toggle), **Aegislash form** toggle.
- Side effects: Reflect, Light Screen, Aurora Veil, Helping Hand, Friend Guard, Tailwind (`Toggle`s).
- Per-move **crit** and **multi-hit count**; **Beast Boost** fainted count; attacker **HP %**; **reset**.
- **Build presets** (Max HB / Max HD via `applySpread`) + reset build; **Showdown import** (per side).

A **move picker** Sheet lists the four move slots, each with `TypeBadge` + its `min–max %` (this is where per-move damage lives, since the HUD is single-direction) and sets the active move.

### 5.5 Control-surface reconciliation (nothing dropped)
| App control | Mobile home |
|---|---|
| Species / Ability / Item / Nature / Move | `MonCard` `SelectRow`s (core) |
| SP stats (6) | `MonCard` `StatGrid` (core) |
| Active move selection + per-move damage | Move picker Sheet |
| Defender HP % | Defender card HP bar (attacker HP % in Advanced Sheet) |
| Weather / Terrain / Target / Auras / Gravity | Field conditions card |
| Stat stages, type override, Aegislash form | Advanced Sheet |
| Reflect/Light Screen/Aurora Veil/Helping Hand/Friend Guard/Tailwind | Advanced Sheet |
| Crit, multi-hit, Beast Boost count | Advanced Sheet |
| Build presets (Max HB/HD), reset | Advanced Sheet |
| Showdown import | Advanced Sheet |
| Regulation/format | AppBar `RegPill` → format Sheet |
| Opponent-team scan | Out of scope this slice (existing flow unchanged) |

---

## 6. Testing

- **Unit:** `useIsMobile` (matchMedia mock); mapping helpers (KO verdict/tone from `koChanceText`; active-direction result selection). Project convention is `src/**/*.test.ts` (no component-render tests) — keep new pure logic in testable modules.
- **Regression guard:** full existing suite stays green; the calc reducer/actions are not modified. `tsc` clean.
- **Manual/mobile verification:** at 360–390px, confirm the Arena Calculator renders, the HUD pins, tabs navigate, Sheets open, and every control in §5.5 is reachable and drives the same dispatches as desktop. Confirm desktop (wide) is unchanged.
- Follow the app's existing verify path (drive the real screen, not just tests).

---

## 7. Implementation outline (plan will expand)
1. Vendor tokens + self-hosted fonts; `useIsMobile`.
2. Port core DS components (`Card`, `Chip`, `Badge`, `Icon`, `Sprite`, `ItemIcon`, `TypeBadge`, `StatField`, `KOVerdict`, `SelectRow`, `Toggle`, `Sheet`).
3. `ArenaShell` (AppBar + TabBar + scroll + Sheet mount) + `Layout` branch; format Sheet on `RegPill`.
4. `ArenaCalculator`: HUD (single direction) + MonCards + field card + SP footnote, wired to `useCalculatorState`.
5. Advanced Sheet + move picker Sheet (full control-surface reconciliation).
6. Verify at mobile width; confirm desktop unchanged; suite + tsc green.

---

## 8. Decisions locked
- Source of truth = Arena VGC Design System; faithful port, not reinvention.
- Trigger = viewport width; desktop untouched.
- Separate mobile shell + template; shared calc state.
- HUD = **single direction** (DS-faithful).
- Overflow = **bottom Sheet** (DS-native).
- Scope = Calculator + shared shell first; Teams / EV·SP / Speed deferred.
- Deps reconciled per the DS readme: self-hosted fonts, inline icons, existing sprite/item atoms.
