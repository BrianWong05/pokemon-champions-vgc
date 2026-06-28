# Pokémon Champions damage calculator — program direction & Spec 1: calc-core correctness

Date: 2026-06-28
Status: Spec 1 implemented (calc-core correctness) — automated tests + type-check + build green (2026-06-29). Manual ChampDex/NCP parity check still pending (human step).

This document records the design agreed during brainstorming. Part A captures the
overall program direction (so later slices share context). Part B is the first
implementation slice we will spec and build: **calc-core correctness**.

---

## Part A — program context

### Vision

A realtime Pokémon Champions damage calculator across **web + Android + iOS + iPadOS**,
built on the existing React app. The signature feature is a **one-tap "capture →
calculate"** flow: while a battle is on screen, the user taps a floating button and the
calculator populates itself.

### Key decisions (from brainstorming + two research passes)

- **Stack: Capacitor.** Wrap the existing React 19 + Vite + `@smogon/calc` + sql.js +
  Tailwind app in a native WebView (≈95–100% reuse) on Android/iOS/iPadOS; keep the web
  build. Native code is limited to thin plugins (overlay, capture, vision). Rejected:
  React Native (full UI rewrite, still needs the same native overlay), Flutter (discards
  `@smogon/calc`), PWA/TWA (cannot create a system overlay).
- **No text-OCR.** Pokémon can be nicknamed by both players, so reading on-screen name
  text is unreliable. Identity comes from **image recognition of the team-preview icons**
  (opponent) and **team-paste import** (own team, nickname→species is exact). In-battle
  capture reads only reliable non-text signals: HP %, weather/terrain, Mega state,
  active/fainted.
- **Auto-fill-then-confirm.** Hidden build fields (SP spread, nature, ability, item) are
  never on screen; default them to Champions' own in-battle Battle-Data meta priors and
  show them as editable fields with confidence coding (green = read, amber = assumed,
  red = unsure). Show rolls instantly; remember corrections per species.
- **Platform split for capture.** Android: same-device one-tap capture via
  `MediaProjection` + a `SYSTEM_ALERT_WINDOW` overlay (consent is per *session*, not per
  tap). Apple: **no** equivalent — iOS/iPadOS cannot screenshot another app on demand and
  cannot float interactive UI over a game; the Apple hero is **companion mode** (point this
  device's camera at the other screen). Companion mode works on every platform.
- **Engine/data.** Champions is a Gen 9 spin-off: the damage formula is the standard Gen 9
  formula that `@smogon/calc` already implements. The differences are **Stat Points (SP)**
  instead of EVs (66 total, cap 32/stat, IVs fixed at 31, level fixed at 50) and the return
  of **Mega Evolution**. Approach: keep `@smogon/calc` and layer Champions data on top.
- **Positioning: deferred.** A live, always-on auto-calc during ranked play is the category
  competitive games police, and TPCi uses strict-liability fair-play rules. Build
  on-screen-data-only (no memory reads, no input automation) with a feature-flag/kill-switch
  so live mode can be gated once Champions' published ToS is reviewed.
- **Store/IP guardrails.** Never put "Pokémon" in the app name/icon; never bundle official
  sprites/artwork/type-icons (the one documented takedown trigger); keep a "not affiliated"
  disclaimer; keep the web app as the un-removable fallback.

### Critical go/no-go (do before building the capture stack)

Test whether Champions sets `FLAG_SECURE` on its team-preview/battle screens. If it does,
Android `MediaProjection` captures return black and the same-device hero feature is dead —
forcing companion-camera mode everywhere. The game is released (Switch 2026-04-08, mobile
2026-06-17), so this is testable now as a small spike.

### Decomposition (each gets its own spec → plan → build)

1. **Calc-core correctness** ← this document (Spec 1).
2. Champions dataset (full Mega + Reg M-B roster/legality) — Spec 2.
3. Capacitor packaging (Android/iOS/iPadOS shells).
4. Android overlay + one-tap capture (Kotlin plugin; includes the `FLAG_SECURE` spike).
5. Image recognition (team-preview species classifier + HP/field/Mega vision).
6. Companion-camera mode (camera frame → same pipeline; Apple hero).
7. Auto-fill-then-confirm UX.

---

## Part B — Spec 1: calc-core correctness

### Goal

Make the Champions damage engine **correct and verifiable** on the existing web app, with a
single source of truth for SP/stat math and a working test suite that pins absolute damage
numbers. Everything downstream (capture, vision, mobile) depends on the calc being right, so
this is the foundation slice.

### Success criteria

1. `npm test` runs `vitest` and all tests pass (today the suite does not run at all).
2. A single canonical module computes Champions stats; another single module converts
   SP↔EV for Showdown interop. No duplicate implementations remain.
3. `@smogon/calc` is fed **Champions-correct final stats**, so a known scenario's damage
   output matches a trusted Champions calculator (ChampDex / NCP) within rounding.
4. Golden tests encode those reference scenarios and guard against regressions.
5. `npm run type-check` passes; the web app builds and runs unchanged in behaviour except
   for corrected damage numbers.

### Problems found in the current code

1. **The test suite is dead.** `package.json` has no `vitest` dependency and no `test`
   script. All three `*.test.ts` files import from stale `@/hooks/*` paths
   (`@/hooks/damage`, `@/hooks/showdown-parser`) that were moved to `@/features/...`.
   `npx vitest run` reports *"3 failed (3) — no tests."* The engine is currently unverified.
2. **SP↔EV is triplicated and the damage path is wrong.** Three implementations exist:
   `convertSpToEv`/`convertEvToSp` in `src/features/pokemon/utils/sp-ev-converter.ts`,
   `calculateSP` in `src/features/pokemon/utils/ev-conversion.ts`, and `spToEv` in
   `src/features/damage-calculator/utils/damage-calc.ts`. Worse,
   `mapToSmogonPokemon` (damage-calc.ts) passes **raw SP values (0–32) directly as `evs`**
   to `@smogon/calc` instead of converting or overriding. `@smogon/calc` then computes final
   stats with the mainline EV formula, which does **not** equal the app's own (correct)
   Champions stat formula. The displayed stat and the damage stat can diverge.
3. **No Champions data overlay yet.** `pokemon_forms` has an `isMega` column and only
   "Regulation M-A" exists as a format. Full Mega/Reg-M data is large, ongoing data-entry —
   deferred to Spec 2. Spec 1 hand-authors only the small sample its golden tests need.

### Design

#### Champions stat model (the source of truth)

At level 50 with IV 31, the existing formulas in `damage-calc.ts` are already correct for
Champions' direct-SP model and become canonical:

- Non-HP stat: `floor((base + 20 + sp) * nature)` — `base + 20` is the 0-SP stat at Lv50/IV31,
  and each SP adds exactly +1 (matching Champions' "1 SP = +1 stat").
- HP: `base + 75 + sp`.
- Constraints: SP cap 32 per stat, 66 total; IVs fixed at 31; level fixed at 50.

The override fed to `@smogon/calc` must be the **clean** stat — base + SP + nature only,
with **no** ability or stat-stage multiplier — because `@smogon/calc` applies boosts,
abilities, items and weather itself during the damage calc. Pre-applying any of those in the
override would double-count them.

#### Single source of truth

- **Champions stats:** consolidate `calculateHP` / `calculateStat` into one canonical module
  (e.g. `src/features/pokemon/utils/champions-stats.ts`), exposing `championsHP(base, sp)`
  and `championsStat(base, sp, nature)` (nature as the numeric multiplier 0.9 / 1.0 / 1.1).
  Stat-stage and ability multipliers stay out of these functions for the override use; any
  display code that wants a boosted value applies stages separately.
- **SP↔EV conversion (Showdown interop only):** keep one module
  (`sp-ev-converter.ts`) with `spToEv(sp)` and `evToSp(ev)` using the official Pokémon HOME
  mapping — first SP = 4 EVs, each additional SP = 8 EVs, i.e. `spToEv(sp) = min(252, 8*sp − 4)`
  for `sp > 0`, and `evToSp(ev) = floor((ev + 4) / 8)`. This is used **only** for importing/
  exporting Showdown pastes (where the outside world speaks EVs), never for the damage stat.
- Delete `calculateSP` (ev-conversion.ts) and `spToEv` (damage-calc.ts); update all imports
  to the canonical modules. (`ev-conversion.ts` may be removed entirely if nothing else uses it.)

#### Feed `@smogon/calc` correct Champions stats (the core fix)

In `mapToSmogonPokemon`, stop passing SP-as-EVs. Instead:

1. Compute each final Champions stat with `championsStat`/`championsHP` (clean, no boosts/
   abilities), using the numeric nature multiplier per stat.
2. Override `@smogon/calc`'s computed stats with those values (set the constructed
   `Pokemon`'s final stats — `rawStats`/`stats`). Keep `level: 50`, `ivs` 31, and continue to
   pass `boosts`, `ability`, `item`, and the `Field` so `@smogon/calc` applies them on top.
3. The exact override mechanism (`rawStats` vs assigning `.stats`, and whether `evs` must be
   zeroed) is the one implementation detail to confirm against the `@smogon/calc` API during
   the build; the golden tests are the acceptance gate.

This guarantees the number `@smogon/calc` uses for damage equals the Champions stat the app
displays.

#### Tests / verification

- **Test infrastructure:** add `vitest` (and jsdom if needed) to devDependencies, add a
  `"test": "vitest run"` script (plus `"test:watch"`), and ensure the `@` alias resolves in
  vitest config. Fix the stale `@/hooks/*` imports in the existing test files to the real
  `@/features/...` paths so the suite runs.
- **Unit tests** for `championsStat`/`championsHP` at known values (e.g. base 100 → 0 SP = 120,
  32 SP = 152; HP base 100 → 0 SP = 175, 32 SP = 207) and SP↔EV round-trips at boundaries
  (0, 1, 31, 32).
- **Golden tests:** 8–12 reference scenarios with damage % taken from a trusted Champions
  calc (ChampDex / NCP), covering neutral, STAB, super-effective, resisted, doubles spread,
  weather, terrain, screens, Helping Hand, a Mega, and a max-SP attacker vs an invested
  defender. Assert `calculate()` min/max % matches. These reference numbers are captured by
  the developer from the trusted calc and recorded in the test file.

#### Small data sample

Hand-author only what the golden tests need: one Mega already present in `@smogon/calc`
(e.g. a returning Mega) plus one **new** Champions Mega (to prove the data-overlay/override
path works for species `@smogon/calc` doesn't know), and a couple of Reg-M Pokémon. The full
dataset is Spec 2.

### Out of scope (Spec 1)

- Full Mega + Reg M-B dataset and legality (Spec 2).
- Any native/Capacitor/mobile work, overlay, capture, OCR/vision (later slices).
- UI redesign — only the minimal edits needed to keep the app compiling and to route through
  the consolidated utilities.

### Risks / open questions

- **`@smogon/calc` final-stat override mechanism** must be confirmed. If clean stat override
  is not supported, the fallback is a calibrated SP→EV that reproduces Champions stats within
  `@smogon/calc`'s rounding — but stat override is preferred for exactness.
- **Trusted golden values** must be sourced from a real Champions calc; the developer
  captures these during the build. Document each scenario's source.
- **Double-application** of abilities/boosts is the main correctness trap; the override must
  carry only base+SP+nature, leaving boosts/abilities/items to `@smogon/calc`.
- The existing `damage-calc.ts` is large and mixes concerns (stat math, name normalization,
  field/move mapping, multihit tables). Spec 1 extracts the stat/SP math into focused modules
  but does **not** refactor the rest beyond what the fix requires.
