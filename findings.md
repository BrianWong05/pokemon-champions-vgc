# Findings — git-verified program state (2026-07-04)

Ground truth is git, not the doc headers (some are stale). Verified this session:

## Merge / branch reality
**UPDATE (later 2026-07-04): `origin/main` advanced to `1248eb4` after PRs #7 (golden refresh,
`245ff83`) and #8 (doc hygiene, `1248eb4`) merged. Local `main` synced; the 3 merged branches
(`chore/hp-reader-golden-refresh`, `docs/status-sync`, `feat/opponent-team-scan`) pruned. No open
PRs. The bullets below capture the earlier PR #6 snapshot.**
- `origin/main` = `88b498d` "Merge pull request #6 from BrianWong05/feat/opponent-team-scan".
  - `git merge-base --is-ancestor 36ec343 origin/main` → YES (Capacitor slice #3 is on main).
  - `git merge-base --is-ancestor 34d8cdb origin/main` → YES (scan slice #5 tip is on main).
- Local `main` was 85 behind / 0 ahead → **fast-forwarded to 88b498d** this session.
- Pruned 3 fully-merged local branches: `champions-calc-core`, `champions-dataset`,
  `docs/mark-spec1-complete` (remotes already gone).
- `feat/opponent-team-scan` (local, 34d8cdb) is merged into origin/main but still holds
  uncommitted WIP → kept, not deleted.

## HP reader (slice #5) — measured
- Side-aware decoding: opponent plates → `%`, player plates → fraction. Committed 34d8cdb.
- **node recall 74/124 (60%), wrong 0**; browser ~55%. Floor test (`scripts/hp-accuracy.test.ts`)
  green (5/5). Re-measured on the uncommitted WIP tree this session — held at 60%/wrong-0.
- `wrong === 0` is the hard invariant. Classical segmentation sits at a wrong-0 local optimum:
  every loosening knob tried (region-tighten, robust-maxH, near-square split, OCR) regressed it.
- CNN path (parked): side-decomposed hybrid — opponent 101-class holistic CNN first
  (single softmax + bar + range cross-check gate; reads fused "100%" whole; plain conv →
  ORT-web INT8), then a fully-convolutional CTC player reader (ORT-web can't INT8 LSTM/GRU).
  Ceiling of seg-then-classify ≈ 72%; ~35 fused/compressed frames have no clean single-char
  segmentation in any config. See memory `opponent-team-scan-progress`.

## The FLAG_SECURE gate (blocks slice #4 and shapes 6)
- Part A "Critical go/no-go": test whether Champions sets `FLAG_SECURE` on team-preview/battle
  screens. If it does, Android `MediaProjection` returns black → same-device one-tap capture is
  dead → program pivots to companion-camera (slice #6) as the primary capture path.
- Game is released (Switch 2026-04-08, mobile 2026-06-17) → testable now as a small spike.
- NOT codeable in this environment: needs the real game running on a device/emulator.

## Known debt
- ~~6 Champions-original Mega abilities not modeled~~ **CORRECTED 2026-07-04: already implemented
  + tested.** `damage-calc.ts` has `getModifiedMoveType` (Dragonize Normal→Dragon),
  `getChampionsMoveOverride` gated to `CHAMPIONS_OFFENSIVE_ABILITIES = {dragonize, fire mane, mega
  sol}`, and `mapToSmogonPokemon` aliases `eelevate`→`Levitate`. `champions-abilities.test.ts` =
  14 passing tests covering all 6 (incl. Piercing Drill / Spicy Spray no-ops). `@smogon/calc`
  silently ignores unknown abilities, so this mattered — and it's handled. Unmodeled bits (Beast
  Boost on-KO, Weather Ball type-from-weather, Protect/Substitute) are intentional out-of-scope.
  The Spec 2 status line + `docs/champions-new-abilities.md` "follow-up" framing are STALE.
- Doc headers: Spec 3 (format-selector) & Spec 4 (capacitor) still "draft for review" despite merge.

## Program constraints (Part A key decisions — don't re-litigate)
- Stack = Capacitor WebView wrap of the existing React app; native code = thin plugins only.
- No text-OCR for identity (nicknames unreliable); identity = team-preview icon recognition +
  team-paste import. In-battle capture reads only non-text signals (HP%, weather/terrain, Mega).
- Apple has no same-device capture → companion-camera is the Apple hero; works on every platform.
- IP guardrails: never "Pokémon" in name/icon; never bundle official sprites/artwork/type-icons;
  keep "not affiliated" disclaimer; web app stays the un-removable fallback.
