# Progress Log

## Session 2026-07-04 — state assessment + main sync (planning-with-files)

**Goal:** answer "what's done / what to do now" and persist it. User parked the HP-reader
CNN deep-work earlier this session and asked to re-orient to `main`.

### Done
- Assessed the scan branch: side-aware HP reader at **node 60% (74/124) / wrong 0**;
  re-ran node accuracy sweep + floor test on the uncommitted WIP tree → held 60%/wrong-0,
  floor test 5/5 pass.
- Discovered (via `git fetch`) the stale local refs were hiding reality: **the whole scan
  feature already merged to `main` via PR #6** — `origin/main` = 88b498d. Corrected the
  earlier (wrong) briefing that said main had 2 unpushed commits.
- **Fast-forwarded local `main`** 36ec343 → 88b498d (== origin/main). Non-destructive ff.
- **Pruned 3 fully-merged branches** with `git branch -d`: champions-calc-core,
  champions-dataset, docs/mark-spec1-complete.
- Kept `feat/opponent-team-scan` (holds uncommitted WIP).
- Surveyed superpowers docs (8 specs, 6 plans) → mapped all 7 Part-A slices to status.
  Confirmed slices 4, 6, 7 have neither spec nor plan → genuinely not started.
- Wrote planning files: task_plan.md, findings.md, progress.md.
- Updated memory `opponent-team-scan-progress.md` with the PR #6 merge fact.

### Errors / corrections
| Issue | Cause | Resolution |
|-------|-------|-----------|
| `git push origin main` rejected (non-fast-forward) | Stale local remote-tracking ref; origin/main had advanced via PR #6 | Fetched, verified ff, updated local main to origin/main instead of pushing |
| Earlier briefing said "main +2 unpushed" | Read stale local refs before fetching | Corrected: main was 85 behind, not ahead |

### Later this session — landed WIP + discovered Mega abilities already done
- **PR #7 opened** (`chore/hp-reader-golden-refresh` → main): golden +3 frames, template rebuild,
  dataset review. Committed `d550c0a`. Had to also track the 3 golden-referenced raw jpgs
  (`04-24-33/37`, `05-01-48`) — they were untracked, so a fresh checkout would have failed the
  floor test. Verified by clearing the `.converted-screenshots` cache to force the
  reconvert-from-tracked-jpg path: 3 frames still read, node 60%/wrong-0, floor test 5/5.
- **Started "implement 6 Mega abilities" → found it ALREADY DONE.** `damage-calc.ts` +
  `champions-abilities.test.ts` (14 tests pass). Did NOT re-implement. Corrected task_plan.md +
  findings.md (the memory/doc "follow-up" note was stale).

### Doc hygiene — PR #8 (`docs/status-sync` → main)
- Fixed 3 stale spec status lines: Spec 3 & Spec 4 were "draft for review" though merged
  (PR #5 / PR #6); Spec 2's Mega-abilities "follow-up" clause corrected to "complete".
- `docs/champions-new-abilities.md` left untouched (already accurate). No stale memory found
  (only `two-db-files-must-sync.md` matched, on "dataset" — unrelated to abilities).
- Commit `969e3dd`, doc-only.

### Both PRs merged by user — main synced, branches pruned
- **PR #7 MERGED** (`245ff83`) — HP golden/template/dataset refresh. **PR #8 MERGED** (`1248eb4`)
  — spec status hygiene. `origin/main` now `1248eb4`.
- Fast-forwarded local `main` 88b498d → `1248eb4`; deleted the 3 merged local branches
  (`chore/hp-reader-golden-refresh`, `docs/status-sync`, `feat/opponent-team-scan`).
- On `main`, working tree clean (only untracked planning files + the pre-existing
  `training/screenshots/` labeling inbox remain). **No open PRs.**

### Stage 4 started — spec + Task-1 plan (branch `feat/android-overlay-capture`)
- Brainstormed stage 4; wrote **Spec 5** (`docs/superpowers/specs/2026-07-05-android-overlay-capture-design.md`,
  commits `fa1cc5a`/`5d5a35b`) — CaptureSource seam isolating the device-gated MediaProjection source
  from a testable ingest→scan→populate core; FLAG_SECURE runbook in Appendix A.
- **Key discovery:** user plays on **iPhone** and imports screenshots — Android same-device capture
  can't be tested/used by them. Decision: **build Task 1 (device-independent seam) now; defer the
  spike (Task 0) + native plugin (Task 2)**.
- Wrote the **Task-1 implementation plan** (`docs/superpowers/plans/2026-07-05-android-capture-seam.md`,
  commit `3fa5fb7`): 3 tasks — CaptureSource + filePickerSource; extract scanFrame/ingestFrame from
  useTeamScan (behavior-preserving); route the modal pick through the seam. HP wrong===0 guarded by
  the existing golden test.
- **Next:** execute the plan (Task 1) — awaiting execution-mode choice.

### Task 1 executed + Android-verified (branch kept, not pushed)
- Executed the plan inline: 3 commits — `8ad5408` (CaptureSource seam + filePickerSource),
  `f27697f` (extract scanFrame/ingestFrame from useTeamScan, behavior-preserving),
  `3546880` (route ScanTeamModal pick through the seam). Each TDD + committed.
- Gates: **full suite 193/193**, tsc clean, HP golden `wrong 0` held.
- **Android emulator verification:** built the mobile bundle (JDK **21**, not the default 25),
  `cap sync android`, `gradlew assembleDebug`, installed the fresh debug APK on Pixel_6_Pro,
  launched it — the app renders (VGC Damage Calculator). Seeded 8 Champions screenshots into the
  emulator gallery for scan testing. (Emulator + dev server now stopped.)
- **Floating-capture (Task 2) discussion:** user asked to test the "floating button over other
  apps" feature — clarified it's NOT built (that's Task 2, deferred); only the in-app file-import
  scan exists today. User chose to KEEP Task 2 deferred and finish Task 1.
- **Finish decision: KEEP branch as-is** (not pushed/merged). Branch `feat/android-overlay-capture`
  holds Spec 5 + Task-1 plan + Task-1 code.

### Task 2 (native floating capture) BUILT + verified end-to-end (2026-07-05)
- Plan `docs/superpowers/plans/2026-07-05-android-floating-capture.md` (`7ab54cb`). Java plugin
  (not Kotlin — app module has no Kotlin). 4 emulator-verified increments, each committed:
  - `fd188ff` ScreenCapture plugin skeleton + overlay perm + JS mediaProjectionSource.
  - `00261cb` foreground service + MediaProjection consent + SYSTEM_ALERT_WINDOW floating button
    + OneTapCaptureToggle + ScanTeamModal externalBlob.
  - `c758fcf` capture() → ImageReader → PNG base64 (verified 1440x3064 PNG via CDP).
  - `0429cc8` bringToFront after capture.
- **End-to-end demo:** floating "Scan" button over Google Photos (showing a Champions battle
  screenshot) → tap → captured the screen → app foregrounded → Scan modal detected opponents
  **Basculegion + Garchomp** and player **Sableye**. Full suite 193/193, tsc clean.
- **Tooling win:** drove the WebView reliably via **Chrome DevTools Protocol** (`scratchpad/cdp.mjs`,
  Node global WebSocket) instead of flaky coordinate taps; native dialogs via `uiautomator dump`.
- **Task 0 (FLAG_SECURE spike) STILL DEFERRED** — real Champions game blocking unverified.

### Landscape fix + PR #9 (2026-07-05)
- User: "when using floating, phone should be horizontal, not vertical." Reproduced the bug —
  capture surface was sized once at session start (portrait), so landscape captures came back
  portrait-sized/distorted. Fixed with a `DisplayManager.DisplayListener` that resizes the
  VirtualDisplay + recreates the ImageReader on rotation (`4402ba4`). Verified: capture flips
  1440x3120 → 3120x1440; landscape capture grabbed the correct battle (Basculegion detected).
- **Known follow-up:** the scan's game-rect/screen-type detection isn't tuned for pillarboxed
  landscape geometry (16:9 game on a 2.16:1 Pixel 6 Pro) — misread a battle as a "team" screen.
  Partly a test artifact (16:9 screenshot in Photos); real game filling the screen would differ.
  Deferred to slice-5 scan tuning, alongside the FLAG_SECURE spike (both need the live game).
- **Finish: PR #9** (`feat/android-overlay-capture` → main, 12 commits) — user's usual review flow.

### Slice 7 (auto-fill UX) built — branch `feat/auto-fill-ux` (2026-07-05)
- Brainstormed → Spec 6 (`92575dc`). **Design pivoted per user**: dropped the confidence-color +
  guessing model; instead a scanned Pokémon starts clean, the user one-tap applies **Max HB**
  (32HP/32Def, Bold) or **Max HD** (32HP/32SpD, Calm), and the calc **remembers the build per
  species** (localStorage) and re-applies on next scan; per-side reset.
- Plan `docs/superpowers/plans/2026-07-05-auto-fill-ux.md` (`32f2ab4`). Executed 5 TDD tasks:
  `b6f0a36` common-spreads, `70a4a8e` build-store, `fc13a29` reducer (APPLY_SPREAD/APPLY_SAVED_BUILD/
  SET_SCAN_LOADED/RESET_BUILD + `loadedFromScan`), `3c19fc2` BuildPresets control, `0f1c97d`
  DamageCalculator wiring (scan-load saved-build lookup + per-side save-on-edit effect + reset).
- **205 tests, tsc clean.** Note: a `.test.tsx` component test was dropped — vitest include is
  `src/**/*.test.ts` only (project convention: no component-render tests). UI not browser-verified
  (Chrome MCP disconnected).

### Slice 6 (companion-camera) built — branch `feat/companion-camera` (2026-07-05)
- Brainstormed → Spec 7 (`67e5d96`). **Minimal path** (per user): a `cameraSource` on the
  CaptureSource seam takes a single photo (Capacitor Camera, `source: Camera`; web capture-input
  fallback) and runs it through the **unchanged** scan pipeline (inferGameRect already handles
  photos-with-margins). "Take photo" button + framing hint in ScanTeamModal → same scan flow.
- Plan `docs/superpowers/plans/2026-07-05-companion-camera.md` (`c384b54`). 2 TDD tasks:
  `f4bbb33` takePhoto + cameraSource (+3 tests), `0dea8b2` scan-modal wiring. **208 tests, tsc clean.**
- **Caveat:** real camera-of-a-screen accuracy unproven (perspective/glare/moiré); un-warp +
  live-preview are documented follow-ups. Niche for this user (imports screenshots already).
- **This completes all 7 Part-A slices.** Only deferred follow-ups remain (FLAG_SECURE spike +
  landscape scan tuning, both need the live game; HP CNN reader parked).

### Parked / deferred
- HP CNN reader parked by user.
- No real calc gap remains (6 Mega abilities done; the rest are intentional out-of-scope).
