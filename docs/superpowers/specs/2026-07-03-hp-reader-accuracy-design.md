# HP Reader Accuracy Pass — Golden Harness + Soft Matching

Date: 2026-07-03
Branch: feat/opponent-team-scan (follow-up to the sprite classifier v2 spec)

## Problem

The HP glyph reader (hpText.ts v2: adaptive white mask, frame cleanup, shear
deskew ladder, template matching) follows the right policy — it returns null
rather than guessing — but recall is ~20%: of ~32 nameplates across the 9
battle screenshots, only ~6 read exactly in Node. The browser reads a
DIFFERENT subset (canvas-decoded pixels differ from pngjs), and produced one
wrong read (true 1% shown as 7%). Template coverage misses the digit 4
entirely.

## Decisions

- **Policy (user choice A): never wrong, prefer blank.** A wrong HP silently
  poisons the damage calc; a blank is a 2-second manual slider. Wrong-read
  count must be 0 on the golden set in BOTH runtimes.
- **No OCR engine.** OCR replaces only glyph classification — the easy half
  of the problem for a fixed 12-char font — while keeping all of our
  segmentation, and adds ~10MB+ payload plus unreliable confidence (fatal for
  the never-wrong policy). It stays available as a measured fallback: if this
  pass stalls below target, run Tesseract.js as an A/B against the same
  golden set with the same preprocessing, and let the numbers decide.
- **Success target:** ≥80% exact reads on the golden set in Node AND in
  browser-decoded pixels, 0 wrong reads. (Occluded/subtitle-covered plates
  count against recall only if a human can read them.)

## Components

### 1. Golden harness (build this first — it referees everything else)

- `training/hp-golden.json`: per screenshot, per side, the expected HP
  strings in panel order (left→right), from the already-collected ground
  truth (e.g. 19-38-20: opponent ["29%","1%"], player ["81/202","193/193"]).
  Plates a human cannot read (fire-occluded, subtitle-covered) are entered as
  null and excluded from recall.
- `scripts/hp-accuracy.ts`: runs the FULL reader (detectBattlePanels +
  readHpFromPanel, with game-rect inference where needed) over every golden
  entry; prints per-plate result and a summary line:
  `recall X/Y (Z%) · wrong N`. Exits non-zero if wrong > 0.
- **Browser-pixel fixtures**: one-time Playwright dump — load each golden
  screenshot in Chromium through the app's own blobToRgbaImage (canvas
  decode) and save the raw RGBA buffers to `training/hp-fixtures/*.rgba`
  (width/height header + bytes). `hp-accuracy.ts --browser` runs the same
  sweep over those fixtures. This makes browser parity a testable number
  without booting a browser per run.
- A vitest smoke test asserts wrong === 0 and recall does not regress below
  a checked-in floor (updated as it improves).

### 2. Template blitz (dual-decoder)

- Extend the template builder to consume hp-golden.json directly: build
  templates from EVERY readable golden plate (both sides), not hand-picked
  ones — and from BOTH pixel sources (pngjs + the browser fixtures), since
  templates built from one decoder systematically mismatch the other.
- This adds the missing `4` (20-29-11 player, "149/185") and multiplies
  variants for every char. Nearest-neighbour matching only benefits from
  variants.
- Templates remain generated artifacts (hpGlyphTemplates.ts +
  training/hp-glyph-templates.json), size is trivial (hundreds of 256-char
  strings).

### 3. Soft (grayscale) matching

- `normalizeGlyph` currently binarizes cell coverage at 0.4 — a hard cutoff
  that decode shifts flip. Keep the aspect-preserving area-average but return
  the FLOAT coverage grid (0..1 per cell).
- Templates store quantized coverage (e.g. 0-9 per cell, one char each — same
  string encoding, 10 levels instead of 2). Match with mean absolute
  difference (L1) instead of Hamming.
- The white mask keeps its adaptive threshold, but the pipeline-config ladder
  gains a threshold dimension (e.g. 0.72 / 0.80 / 0.88 of peak) so a decode
  shift that erodes strokes at one threshold is recovered at another.
  (Ladder attempts are already validated by parse + bar cross-check, so
  extra configs are safe, just slower on failure — acceptable: worst case a
  few hundred ms per plate, and successes exit early.)

### 4. Margin rule (the never-wrong mechanism)

- matchGlyph accepts a glyph only if:
  - best distance ≤ threshold, AND
  - (best distance of any DIFFERENT char) − (best distance) ≥ margin.
- Ambiguous glyphs (1 vs 7 at small sizes) become null → the phrase fails →
  blank, never wrong. Existing phrase-level guards stay: parse shape,
  bar-fill cross-check, the no-0% rule, hFrac gate.
- Threshold + margin are tuned against the golden harness, optimizing recall
  subject to wrong = 0 in both runtimes.

## Error handling

Unchanged app behavior: null HP → the calc leaves HP at 100% for manual
adjustment; the UI shows no HP badge. The bar-fill estimate remains an
internal cross-check only (per policy A, no estimated values are presented as
readings).

## Testing

- Unit tests: existing hpText suite continues to pass (updated for the
  grayscale template format); new tests for margin-rule accept/reject and
  the quantized template encode/decode.
- Golden: `scripts/hp-accuracy.ts` (Node) and `--browser` (fixtures) both
  report recall ≥ 80%, wrong = 0. Vitest smoke test enforces the floor.
- Manual: scan 19-38-20 in the app — the 29% and 1% plates both show HP
  badges with correct values.

## Out of scope

- OCR integration (fallback experiment only, and only if the target is
  missed).
- Reading anything beyond HP text (timer, move PP).
- The user's queued "minor crop fixes" (separate item).

## Addendum (2026-07-03, approved): constrained phrase decoding

Per-glyph accept/reject discards phrase-level evidence. Replace the read
core with joint decoding:

- Per glyph box, compute the DISTANCE PER CHARACTER (min over that char's
  templates, hFrac-gated, char set restricted by the box's shape bands)
  instead of a hard match.
- Per candidate window, find the cheapest VALID phrase (language: `N%` with
  1<=N<=100, or `A/B` with A<=B and B in a plausible HP range) via top-2
  chars per position and a small product search.
- Across ALL attempts (mask thresholds x pipeline configs x windows), keep
  the best candidate per distinct VALUE. Accept iff the best value's cost is
  under a ceiling AND it beats the best DIFFERENT value by a phrase margin;
  when two values sit within the margin, the bar fill may arbitrate (pick
  the one it corroborates within 12 points) — otherwise blank.
- Existing guards retained: bar disagreement veto, truncation-shadow rule,
  no-0% (baked into the language).
- Segmentation fixes bundled: the speck filter must keep the SMALL `/max`
  digits (two text sizes are legitimate), and boxes whose shape fits no
  character make their window invalid rather than poisoning clusters.

Explicitly rejected: surfacing bar-fill estimates in the UI (user decision)
— the HP badge only ever shows glyph-exact reads.
