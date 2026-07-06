# Single-Plate Battle Detection

Date: 2026-07-06
Branch: feat/single-plate-detection
Status: Design approved — ready for implementation planning

## Goal

Battle-screen scans fail whenever a side is down to ONE Pokémon (doubles
endgame) — and would fail on EVERY frame of a singles battle. Fix the
detection logic so single-plate frames route to battle mode, without
re-introducing the team-preview false positive the current pair rule was
built to prevent. No model retrain involved; this is pure detection logic.

## Root cause (verified)

- `isPlatePairRow` (`src/features/scan/scanTargets.ts:54`) hard-requires
  exactly 2 opponent plates side-by-side; `detect()` (line 61) enters battle
  mode ONLY via this gate. Player plates are never consulted for the mode.
  One opponent plate ⇒ mode `team` ⇒ junk team targets.
- The rescue path can't recover: `findPlatePair`
  (`src/features/scan/gameRect.ts:52`) also needs two side-by-side magenta
  blobs (and `findCardStack` needs ≥4), so `inferGameRect` returns null and
  `detectScanTargets` falls back to the wrong team-mode fast result. Both
  the fast path AND the retry are pair-gated — unrecoverable.
- The pair gate is deliberate (file header): the clipped top card of a
  team-preview opponent column is also magenta and lands in the opponent
  search region (`x > 0.45w`, `y < 0.22h`), so a naive single-panel rule
  would misread team screens as battles. The fix must break this tie with
  positive evidence, not a looser count.
- Asymmetry: 1 player plate + 2 opponent plates works today (mode is decided
  by the opponent side alone; `battleTargets` maps 0–2 player panels
  count-agnostically). 1 opponent plate breaks everything regardless.
- Coverage hole: all 32 battle entries in the HP golden set have exactly 2
  opponent plates; every battle test canvas is built with a pair. The
  failure class was structurally invisible to the suite.

## Decisions made during brainstorming

- **Scope: fix first, harness-shaped.** Ship the detection fix now; its
  fixtures are structured as a small golden file that seeds the future
  full species/mode golden harness (separate follow-up design). The queued
  battle-icon crop tighten + retrain cycle stays queued — NOT part of this.
- **Mechanism: hierarchy with plate-internals verification** (approach A +
  card-stack guard), not a cross-side structural vote (weak evidence —
  team-preview player cards are also indigo/bottom-left) and not a scored
  classifier (needs the full harness to tune honestly; overkill).
- **Either side can be the singleton**: the verifier applies to player
  plates too (they also carry bar tracks), so a frame whose opponent plate
  is missed but whose player plate is clear still routes to battle.
- **Glow erosion is handled fixture-first**: with one player Pokémon left,
  the lone plate is usually the ACTIVE one with a green glow border, which
  plausibly erodes the indigo mask (`b > g + 50`). Measure on the real
  glowing-plate fixture before changing the predicate.
- **Rect inference stays opponent-magenta-anchored.** A player-plate anchor
  is deferred until a real fixture demands it.
- Reference frames (user-provided, to be saved into `training/screenshots/`):
  (1) a Raichu 1-opp/2-player YouTube frame (facecam, overlay text, 2% HP,
  glowing player plate); (2) a Pelipper 1v1 CJK-UI frame (65% / 152/152,
  non-glowing player plate as glow control); (3) a Charizard/Basculegion
  1v1 frame whose shiny-PINK Basculegion model fills the frame center —
  plate-mask-adjacent magenta noise — with a 100% full-fill opponent bar;
  (4) a Froslass 1v1 frame pair (with and without the FIGHT/POKÉMON action
  menu; CJK opponent nickname, 39% yellow bar) whose singleton opponent
  plate sits at the LEFT slot position; (5) a Sylveon("Elara")-vs-Charizard
  1v1 frame under Harsh Sunlight — the whole arena tinted green (mask
  color-shift stress) — 23% yellow bar, RIGHT slot; (6) a Whimsicott-vs-
  Rotom+Garchomp frame: LEFT-slot opponent singleton (48% yellow bar)
  against a FULL player pair (54/127 and 167/185) — also the reference for
  player-pair slot geometry; (7) a Charizard-mirror 1v1 frame with facecam:
  player singleton ("Elara", 177/177) at the player pair's LEFT slot while
  the opponent singleton (46% yellow bar) sits at the RIGHT slot — slots
  vary INDEPENDENTLY per side — and the player plate is glowing green over
  a full green bar (harder glow-erosion stress than the Raichu frame's,
  since glow abuts same-colored fill); (8) a CJK 1v1 sandstorm frame:
  player LEFT (44/195) + opponent LEFT (50%) — the L+L combination — under
  an orange/tan arena tint (warm complement to frame 5's green), with a
  fully CJK action menu and a shiny purple Basculegion model as frame-left
  color noise.
- **Dataset status (2026-07-07):** frames 2–8 plus 9 more are SAVED — 16
  files in `training/screenshots/` (`Xnip2026-07-06_23-38-43` …
  `Xnip2026-07-07_00-12-02`), machine-classified into
  `training/scan-golden.draft.json` (uncommitted; needs human spot-check).
  All 16 are 1-opponent-plate battle frames; all six slot combinations are
  represented (opp R×pair 6, L×pair 3, R×pL 2, R×pR 2, L×pR 2, L×pL 1);
  extremes include a 1/155 near-dead player bar, snow/sandstorm/harsh-
  sunlight/tailwind weather, purple/green/gold/yellow arena tints, 8
  glowing player plates, and several letterboxed frames. Frame 1 (Raichu)
  is NOT yet saved.
- **Singleton plates occur at BOTH slot positions of the doubles pair**
  (frames 1–3 and 5 show the right slot; frames 4 and 6 the left), so both
  rect hypotheses are mandatory — neither may be skipped as an
  optimization. The same holds on the PLAYER side: a lone player plate can
  occupy either slot of the player pair. Mode vote and `battleTargets` are
  slot-agnostic (region + verifier, no slot prior), so this costs no code —
  but fixtures must cover both player slots, and the deferred player-plate
  rect anchor would need both hypotheses too. The two sides' slots vary
  independently — demonstrated by example, not assumed: frame 7 is player
  LEFT + opponent RIGHT, frame 8 is player LEFT + opponent LEFT — so no
  cross-side slot correlation may be assumed.

## Components

### 1. Mode-vote hierarchy (`scanTargets.ts`)

`detect()` becomes four rungs, first match wins:

1. Opponent plate pair on one row → **battle** (unchanged — zero regression
   risk for existing frames).
2. ≥4 opponent team cards → **team** (card-stack guard; formalizes the
   existing team-confidence signal so the false-positive scenario never
   reaches rung 3; team detection already ran in today's else-branch).
3. Any panel on EITHER side passing the plate-internals verifier →
   **battle**, using the verified panel(s). Covers 1-left doubles, singles,
   and fragmented-plate frames that fail the row-geometry check.
4. Otherwise → **team** (today's fallback).

`battleTargets(img, side)` gains an optional pre-detected-panels parameter
so rung 3's verified subset flows through instead of being re-detected.
`isConfident` keeps treating battle as confident.

### 2. Plate-internals verifier

A real battle plate contains an **HP-bar track**: a clean horizontally-
elongated strip spanning most of the plate width at a consistent height in
the plate's lower band. Team cards never have one. Keyed on strip geometry,
not on any particular color, so BOTH extremes pass: a near-empty bar
(2% HP — nearly all dark track) and a completely full bar (100% — all
green fill, no track visible). Implementation reuses the band-coherent
bar-locating primitives in `hpText.ts` (including its full-bar handling) —
no new pixel heuristic family. Second acceptance path: `readHpFromPanel` returning
non-null (precision-perfect under the wrong-0 invariant; adds recall on
degraded bars). Known adversarial case pinned by a negative fixture: a
clipped team card whose sprite contains a dark elongated region — rejected
by the width-span + band-coherence requirements.

### 3. Single-plate game-rect anchor (`gameRect.ts`)

When `findPlatePair` fails but one plate-aspect magenta blob exists:
generate slot hypotheses ("blob is the LEFT plate" / "RIGHT plate" of the
pair prior; slot fractions measured from existing 2-plate golden frames).
Real frames show singletons at BOTH slot positions (reference frames 1–3
and 5 right; 4 and 6 left), so both hypotheses always run; validation
picks the survivor.
Solve a candidate rect per hypothesis and validate by re-running detection
inside it; accept only a rect yielding battle mode with a verified plate.
All hypotheses fail → null → existing manual CropStep fallback. Cost: at
most two extra detection passes per candidate blob, only on the
already-slow rescue path.

Validation is load-bearing, not belt-and-suspenders: `magentaBlobs` sweeps
the WHOLE image (no region filter), and shiny-pink Pokémon models (the
Basculegion reference frame) shed plate-mask-adjacent fragments that can
pass the plate aspect filters and become junk anchor candidates. Every
candidate blob's hypotheses go through the same validation; junk anchors
produce rects with no verified plate inside and are rejected.

### 4. Golden seed + runner (harness-shaped fixtures)

- `training/scan-golden.json`: one entry per frame —
  `{ file, mode, opponentPlates, playerPlates }`. Seed composition:
  - The 16 saved single-plate frames (`training/screenshots/`
    `Xnip2026-07-06_23-38-43.jpg` … `Xnip2026-07-07_00-12-02.jpg`),
    machine-classified in `training/scan-golden.draft.json` — promotion to
    the real golden requires a human spot-check of the draft, especially
    the `opponentSlot`/`playerSlot` columns (slot truth drives the
    rect-anchor tests). Draft annotations (slots, HP text, glow, features)
    stay as optional fields; harness truth is mode + plate counts.
  - At least 4 existing 2v2 battle frames from the HP golden set, and at
    least 2 team-preview screenshots, as mode-regression guards.
  - The Raichu reference frame (frame 1) once saved — still the only
    2%-bar + 1-opp-vs-2-player + glowing-Swampert-mask case.
  Schema deliberately extensible (species per slot, HP truths) so the
  future classifier harness grows on this file.
- `scripts/scan-mode-accuracy.ts`: mirrors the HP harness shape (including
  its jpg/heic golden-resolution logic via `resolveGoldenPng`-style
  handling); runs the real `detectScanTargets` per frame; reports mode
  correctness + per-side plate counts vs truth.
- Floor test `scripts/scan-mode-accuracy.test.ts`: **zero wrong modes** on
  the golden set — the analog of the HP reader's `wrong === 0` invariant.
  Unlike HP, detection always outputs a mode (there is no "blank"), so a
  frame that proves genuinely undetectable during implementation gets an
  explicit `knownMiss: true` flag: excluded from the floor, still reported
  by the runner so it stays visible as future work.
- Node-only. Detection is pure pixel JS (no ORT). Known caveat: node vs
  browser PNG decode can differ slightly; mode decisions are blob-level,
  so the risk is far lower than for glyphs.

## Error handling — the fix is strictly additive

- Rung 1 untouched ⇒ every currently-working frame behaves identically.
- Rung 3 can only ADD battle detections to frames that today misroute to
  team-with-junk.
- Verifier false-negative on a real plate → falls to team → unconfident →
  manual CropStep — exactly today's behavior, no worse.
- Rect-hypothesis validation failure → null → CropStep, as now.
- Unreadable HP on a verified plate → `hpPercent: null` → manual entry,
  as now.
- The scan modal already renders 1–2 battle targets fine (verified:
  pass-through is count-agnostic end to end).

## Testing

- **Unit (synthetic canvases):** mode vote — 1-opp+2-player → battle;
  1v1 → battle; 1-opp+0-player → battle; magenta card-like blob WITHOUT a
  bar track → team (pins the false-positive guard); card stack with clipped
  magenta top card → team; existing pair tests unchanged. Singleton-plate
  cases run at BOTH slot positions on BOTH sides (opponent left/right,
  player left/right) — detection must be slot-agnostic.
- **Verifier:** bar-track positive at ≥2 source resolutions; near-empty
  (2%) bar positive; full (100%) bar positive; dark-sprite-inside-card
  negative; shiny-pink model fragment negative.
- **Rect anchor:** letterboxed synthetic frames with a single plate at the
  RIGHT-slot fraction AND at the LEFT-slot fraction → rect recovered in
  both; wrong-slot hypothesis rejected by validation; zero plates → null;
  shiny-model junk blob alongside the real plate → real plate's rect wins
  (Basculegion reference frame).
- **Player glow:** the glowing player plate crop as a
  `detectBattlePanels('player')` fixture; if the mask measurably erodes,
  widen the predicate — decided by measurement, not guesswork (the
  non-glowing Pelipper-frame plate is the control).
- **Golden:** floor test as above; existing HP tests and scanTargets tests
  keep passing.

## Out of scope

- Battle-icon crop tighten + crop regeneration + `--resume` retrain
  (queued for the next labeling cycle, per the existing decision that
  geometry changes and retrains travel together).
- The full species/mode golden harness across domains (follow-up design;
  this spec only seeds its golden file).
- Player-plate rect anchor.
- The parked HP CNN reader.
- Classifying 3D arena models; any OCR.
