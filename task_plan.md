# Task Plan — Pokémon Champions VGC: program roadmap & next steps

Goal: keep a single, git-verified view of the program (Part A decomposition in
`docs/superpowers/specs/2026-06-28-champions-calc-core-correctness-design.md`) so any
session knows **what's done** and **what to do now**.

Last synced: 2026-07-05. On `main` (HEAD `44b9f5b` == origin/main). **PRs #7–#10 merged.**
`origin/main` now contains **slices 1–5 + 7** (slice 7 = auto-fill UX via PR #10, `44b9f5b`) + the
format-selector insert. Working tree clean; merged local branches pruned.
**ALL 7 Part-A slices now implemented** (slice 6 built on `feat/companion-camera`, awaiting merge).
Remaining = only the deferred follow-ups: slice-4 FLAG_SECURE spike + landscape scan tuning (both
need the live game), and the parked HP CNN reader.

## Program slices (Part A) — status

| # | Slice | Spec / Plan | Status |
|---|-------|-------------|--------|
| 1 | Calc-core correctness | spec `…06-28…`, plan `…calc-core-correctness` | ✅ complete, merged to main 2026-06-29 |
| 2 | Champions dataset (Mega + Reg M-B) | spec `…champions-dataset`, plan same | ✅ implemented, merged (PR #4). The 6 Champions-original Mega abilities are **also DONE** — implemented in `damage-calc.ts` + 14 passing tests in `champions-abilities.test.ts` (the doc's "follow-up" note is stale). |
| — | Format selector (inserted) | spec `…format-selector` | ✅ merged (PR #5) |
| 3 | Capacitor packaging (Android shell) | spec `…capacitor-android-packaging` (hdr still "draft") | ✅ done + verified, on origin/main (commit 36ec343) |
| **4** | **Android overlay + one-tap capture** (Java plugin; incl. FLAG_SECURE spike) | spec `…2026-07-05-android-overlay-capture-design`; plans `…-android-capture-seam` (T1), `…-android-floating-capture` (T2) | ✅ **Tasks 1 + 2 MERGED via PR #9 (`758ea97`).** T1 CaptureSource seam + T2 native floating capture, **verified end-to-end on the Pixel_6_Pro emulator** (floating button over Photos → capture → app foregrounds → scan detected Basculegion/Garchomp/Sableye). Orientation-aware capture (resizes on rotation, `4402ba4`). **193 tests, tsc clean.** **Deferred/follow-ups:** Task 0 FLAG_SECURE spike (real-game blocking unverified); landscape scan-detection tuning (capture is landscape-correct, but game-rect/mode detection needs tuning for pillarboxed 16:9-on-2.16:1 geometry). |
| 5 | Image recognition (sprite classifier + HP/field vision) | specs `…opponent-team-scan`, `…sprite-classifier-v2`, `…hp-reader-*`; plans same | ✅ merged via PR #6 (out of order). HP reader side-aware @ **60% recall / wrong 0**. CNN reader **parked** by user |
| 6 | Companion-camera mode (Apple hero) | spec `…2026-07-05-companion-camera-design`, plan `…2026-07-05-companion-camera` | 🟢 **BUILT on `feat/companion-camera` (4 commits).** Minimal path: `takePhoto()` (Capacitor Camera, source Camera) + `cameraSource` on the seam; "Take photo" button + framing hint in the scan modal → same scan flow. **No new vision** (photo runs through the unchanged pipeline). **208 tests, tsc clean.** Caveat: real camera-of-a-screen accuracy unproven (un-warp/live-preview = follow-ups). |
| 7 | Auto-fill-then-confirm UX | spec `…2026-07-05-auto-fill-confirm-ux-design`, plan `…2026-07-05-auto-fill-ux` | ✅ **MERGED via PR #10 (`44b9f5b`).** Revised design (per user): clean start (no guessing/colors), one-tap **Max HB / Max HD** spreads, remember build per species (localStorage), per-side reset. 5 TDD tasks — common-spreads, build-store, reducer actions (APPLY_SPREAD/APPLY_SAVED_BUILD/SET_SCAN_LOADED/RESET_BUILD + `loadedFromScan`), BuildPresets control, DamageCalculator wiring. **205 tests, tsc clean.** UI not browser-verified this session (Chrome tool disconnected). |

## Open loose ends (decide next)

- [x] ~~**Uncommitted WIP** — golden +3 frames, rebuilt `hp-glyph-templates.json`, dataset
      review~~ **MERGED via PR #7** (`245ff83`). Verified 60%/wrong-0, floor test green;
      also tracked the 3 golden-referenced raw jpgs so a fresh checkout resolves.
- [ ] **Slice #4 FLAG_SECURE spike** — test whether Champions blacks out
      `MediaProjection` captures. Determines whether same-device one-tap capture is
      viable or the program pivots to companion-camera (slice #6). **Not codeable here —
      needs the real game on an Android device/emulator.**
- [x] ~~**Calc debt** — model the 6 Champions-original Mega abilities~~ **ALREADY DONE**
      (`damage-calc.ts` + `champions-abilities.test.ts`, 14 tests pass). The only unmodeled
      bits (Beast Boost on-KO, Weather Ball type-from-weather, Protect/Substitute state) are
      **intentionally out of scope** for a damage calculator — no real gap remains.
- [ ] **HP reader CNN** — side-decomposed hybrid (opponent 101-class holistic CNN, then
      conv-CTC player reader). Architecture decided, **parked by user**. Path 60% → 80%.
- [x] ~~Doc hygiene: Spec 3 & Spec 4 headers still "draft for review"~~ **MERGED via PR #8**
      (`1248eb4`): Spec 2 "follow-up" clause + Spec 3/4 status lines corrected to shipped reality.

## Candidate next actions

1. ✅ DONE + MERGED — WIP landed as PR #7 (`245ff83`).
2. ✅ ALREADY DONE — the 6 Mega abilities were implemented + tested before this session.
3. ✅ DONE + MERGED — spec-status doc hygiene as PR #8 (`1248eb4`).

**All this session's work is merged; main is clean at `1248eb4`, no open PRs.**
The real remaining next step is the **FLAG_SECURE spike** (slice #4 gate — device task; I can
write the runbook), or a new direction (e.g. resume HP-reader CNN, or start companion-camera).
