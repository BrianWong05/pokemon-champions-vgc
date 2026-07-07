# Text Glyph Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the game-font-vs-render-font noise floor in player-scan text matching by extracting per-character glyph templates from labeled golden screenshots (zh-Hant + ja) and using them as a high-confidence first pass, with the existing canvas shape-matching as fallback — then flip the corresponding KNOWN_ISSUES/exception entries to strict assertions.

**Architecture:** A language-agnostic char→glyph atlas (generated TS file, like `statGlyphTemplates.ts`) is built at dev time from `training/player-golden.json`-labeled move/ability/item crops. At scan time, candidate strings whose every char is covered are *composed* from atlas glyphs into a BinMask and scored through the existing `shapeFromMask`/`shapeDistance` machinery — game font vs game font, so correct candidates score near 1.0. If the best atlas score clears an acceptance threshold, that ranking wins; otherwise fall back to canvas rendering unchanged. This also removes platform-font dependence (Android/WebView) for covered strings.

**Tech Stack:** TypeScript, vitest, pngjs (via `scripts/build-hp-glyph-templates.ts` `readPng`), better-sqlite3 (label lookup), existing `textMatch.ts` mask machinery.

## Global Constraints

- Crop-side binarization stays `whiteMask(img, box, 0.72)` (`textShapeAt`) — the atlas is built at the same threshold so stroke weights agree.
- No new dependencies. No DB writes (two-DB sync not needed).
- EN atlas is out of scope (proportional font segmentation is not cheap; EN already gated at 35/36 with an approved exception). Note this in the spec.
- KNOWN_ISSUES species entries (zh-team17 slots 0/4) are classifier misses — out of scope, do not touch.
- Every flipped test entry must be verified by running `npx vitest run scripts/player-scan-accuracy.test.ts` (slow, ~minutes; ONNX).
- Worktree: `training/` assets are already rsynced; `node_modules` installed with `--legacy-peer-deps`.

---

### Task 1: Atlas composition + hybrid matching (runtime side, pure functions)

**Files:**
- Modify: `src/features/scan/textMatch.ts` (export `stripRuleLines`, `stripLeadingIcon`, `inkBounds`; add atlas types + `parseAtlas` + `composeAtlasMask` + `matchTextShapeHybrid`)
- Test: `src/features/scan/textMatch.test.ts` (new describe block)

**Interfaces (produced):**
- `interface AtlasGlyphData { char: string; w: number; h: number; yOff: number; hex: string }`
- `interface TextAtlas { glyphs: Map<string, { w: number; h: number; yOff: number; bits: Uint8Array }>; gap: number }`
- `parseAtlas(entries: AtlasGlyphData[], gap: number): TextAtlas`
- `composeAtlasMask(atlas: TextAtlas, label: string): BinMask | null` — null when any char is uncovered
- `matchTextShapeHybrid(shape: TextShape, candidates: TextCandidate[], render: TextRenderer, atlas: TextAtlas | null, topN = 3): TextMatchResult[]`
- `ATLAS_LINE_H = 32`; acceptance constant `ATLAS_ACCEPT` (initial 0.9, calibrated in Task 3)

**Steps:**

- [ ] **Step 1: Write failing tests** — synthetic atlas built by hand-packing two fake glyphs; assert compose returns null on uncovered char; assert a canvas-derived "atlas" (extract glyph masks from a canvas rendering, feed as atlas) makes `matchTextShapeHybrid` prefer the exact composition over a decoy, and that sub-threshold atlas scores fall back to `matchTextShape` results.
- [ ] **Step 2: Run** `npx vitest run src/features/scan/textMatch.test.ts` — expect FAIL (functions not defined).
- [ ] **Step 3: Implement** — hex pack/unpack (4 bits per hex digit, row-major), composition (x-advance = glyph.w + gap, y at yOff, canvas h = max(yOff+h, 32), 2px margins), shape cache per atlas via `Map<string, TextShape | null>`, hybrid gate `scored[0]?.score >= ATLAS_ACCEPT`.
- [ ] **Step 4: Run tests** — expect PASS.
- [ ] **Step 5: Commit** `feat(scan): atlas composition + hybrid text matching primitives`

### Task 2: Atlas builder script + generated atlas + golden-crop gate

**Files:**
- Create: `scripts/build-text-glyph-atlas.ts`
- Create (generated): `src/features/scan/textGlyphAtlas.ts`
- Test: `src/features/scan/textMatch.test.ts` (golden-crop describe, gated on `training/player-screens`)

**Interfaces:**
- Consumes: Task 1's `parseAtlas`/`composeAtlasMask`/`matchTextShapeHybrid`; `readPng` from `build-hp-glyph-templates.ts`; `detectPlayerPanels`; `buildVocabNode` pattern from `player-scan-core.ts` (better-sqlite3 label lookup by `name_en`).
- Produces: `TEXT_GLYPH_ATLAS: AtlasGlyphData[]` and `TEXT_GLYPH_GAP: number` in the generated file.

**Builder algorithm:**
1. For each golden pair with `lang !== 'en'`: decode movesImage, `detectPlayerPanels`, per slot look up localized labels (ability/item/4 moves) from the DB by the golden's English names (`name_zh` for zh-Hant, `name_ja` for ja); skip null labels (e.g. Scraftite).
2. Per (box, label): `whiteMask@0.72` → `stripRuleLines` → `stripLeadingIcon` → `inkBounds` → column-projection blobs → group into `[...label].length` contiguous groups by pitch-uniformity DP (minimize Σ|groupExtent − pitch|); skip crop on failure (log).
3. Per group: vertical ink bounds; scale mask region to line height 32 (area-average, ≥0.5 → 1); record `yOff`. Record inter-group gaps (scaled); atlas gap = global median.
4. Dedupe per char: keep the largest-native-height variant; warn on shape conflicts.
5. Validation report: for every labeled crop, rank the label among the species' full lang vocab via the atlas pass; print rank/score/margin (calibration data for `ATLAS_ACCEPT`).

**Steps:**

- [ ] **Step 1: Write failing golden-crop test** — the four target crops must rank top-1 via atlas pass against full per-species vocab: zh-team17 slot2 move2→順風 Tailwind; ja-rental-r676 slot0 move2→ちょうはつ Taunt; slot5 move1→ヘドロウェーブ Sludge Wave; slot4 item→マフォクシーナイト Delphoxite.
- [ ] **Step 2: Run** — FAIL (no atlas file).
- [ ] **Step 3: Implement builder; run it** `npx tsx scripts/build-text-glyph-atlas.ts`; iterate on segmentation until the needed chars extract cleanly.
- [ ] **Step 4: Run test** — PASS. Also investigate ja slot0 move4 (Light Screen) null-shape while here; fix if it's a threshold/strip bug, else document.
- [ ] **Step 5: Commit** `feat(scan): per-language text glyph atlas built from labeled goldens`

### Task 3: Integrate hybrid pass into the scan path + calibrate

**Files:**
- Modify: `src/features/scan/scanPlayerFrame.ts` (`readTextField` → `matchTextShapeHybrid` with parsed atlas)
- Modify: `src/features/scan/textMatch.ts` (only if calibration moves `ATLAS_ACCEPT`)

**Steps:**

- [ ] **Step 1:** Wire `parseAtlas(TEXT_GLYPH_ATLAS, TEXT_GLYPH_GAP)` (module-level, lazy) into `readTextField`.
- [ ] **Step 2:** Calibrate `ATLAS_ACCEPT` from the builder's validation report (correct-label score distribution vs best-wrong score distribution).
- [ ] **Step 3:** Run `npx vitest run src/features/scan/` — no regressions (esp. en-rental golden crops, scanPlayerFrame tests).
- [ ] **Step 4: Commit** `feat(scan): atlas-first text matching with shape fallback`

### Task 4: Flip test entries + full gate + docs

**Files:**
- Modify: `scripts/player-scan-accuracy.test.ts` (remove passing KNOWN_ISSUES.move entries + ja Delphoxite exception; keep species entries + EN Swampertite)
- Modify: `src/features/scan/scanPlayerFrame.test.ts` (if its exceptions list covers the same crops)
- Modify: `docs/superpowers/specs/2026-07-07-player-team-scan-design.md` (Risks: atlas shipped, EN deliberately skipped)

**Steps:**

- [ ] **Step 1:** Remove the now-fixed entries; run `npx vitest run scripts/player-scan-accuracy.test.ts` — PASS with strict assertions.
- [ ] **Step 2:** Run the whole suite `npx vitest run` — green (or pre-existing failures only, documented).
- [ ] **Step 3:** Update spec + memory; commit `test(scan): flip atlas-fixed known issues to strict assertions`.

## Self-Review

- Spec coverage: Risks §1 fallback (atlas) — Tasks 1–3; KNOWN_ISSUES flips — Task 4; platform-font note — architecture + spec update. EN atlas explicitly skipped per "if cheap" (it is not).
- The ja slot0 move4 null-shape is inside Task 2 Step 4 as investigate-fix-or-document; flipping that KNOWN_ISSUES entry depends on the outcome (entry may be updated rather than removed).
- Types consistent: `AtlasGlyphData`/`TextAtlas` defined once in Task 1, consumed by Tasks 2–3.
