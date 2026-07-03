# Task 1 Report: Pure Character Sample Extraction Core

## What I implemented

Created `scripts/hp-character-dataset-core.ts` as a pure TypeScript extraction core for HP character samples.

The module now exports:
- `HP_DATASET_CLASSES`
- `ExtractedHpCharacterSample`
- `PanelSampleResult`
- `classNameForChar(char)`
- `charsForExpectedText(text)`
- `selectGlyphBoxes(mask, clusters, expectedText)`
- `normalizeBoxToImage(mask, box, width?, height?, pad?)`
- `samplesFromPanel(img, panel, expectedText)`

Behavior included:
- stable dataset class names for digits, `/`, and `%`
- validation of expected HP text characters
- glyph-box selection with percent-sign reassembly and fallback splitting
- 24 x 32 normalized sample rendering
- panel-level sample extraction using the existing HP text pipeline helpers

Created `scripts/hp-character-dataset-core.test.ts` with focused coverage for:
- class name mapping
- expected-text parsing
- percent-box merging
- sample normalization
- end-to-end synthetic panel extraction

## Test commands and results

Red step:
- Command: `npx vitest run scripts/hp-character-dataset-core.test.ts`
- Result: failed as expected because `./hp-character-dataset-core` did not exist yet

Green step:
- Command: `npx vitest run scripts/hp-character-dataset-core.test.ts`
- Result: passed
- Summary: 1 test file passed, 5 tests passed

## TDD evidence

RED:
- The focused Vitest run failed with `Cannot find module './hp-character-dataset-core'`, which confirmed the test was exercising the missing production module.

GREEN:
- After adding the core module, the same focused Vitest run passed with all 5 tests green.

## Files changed

- `scripts/hp-character-dataset-core.test.ts`
- `scripts/hp-character-dataset-core.ts`

## Self-review findings

- The implementation stays within Task 1 scope and does not add the CLI or filesystem writer.
- The sample extraction path is pure and deterministic, with no side effects.
- The synthetic test covers the key flow that matters for this task: label mapping, glyph selection, normalization, and panel extraction.

## Concerns

- The percent-box merge logic is intentionally tuned to the task brief and current glyph pipeline behavior. It is adequate for Task 1, but later tasks may need broader heuristics if more capture shapes appear.

## Fix Notes

### What changed

- Tightened `selectGlyphBoxes()` so the percent fallback only accepts a single extra trailing box beyond the expected character count.
- Added a regression test that rejects over-segmented prefix glyphs for `%` samples instead of merging ambiguous tails.
- Strengthened the normalization test to assert that foreground pixels are white in RGB, not just opaque in alpha.

### Test command and result

- Command: `npx vitest run scripts/hp-character-dataset-core.test.ts`
- Result: passed
- Summary: 1 test file passed, 6 tests passed

### Files changed

- `scripts/hp-character-dataset-core.ts`
- `scripts/hp-character-dataset-core.test.ts`

### Self-review

- The percent fallback is now conservative and skips ambiguous plates rather than synthesizing a mislabeled `%`.
- The added regression coverage hits the specific over-segmentation pattern called out in review.
- The normalization assertion now checks actual foreground color values, which better guards against a false-positive pass.
