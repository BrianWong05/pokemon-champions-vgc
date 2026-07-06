# Player Team Scan — Design

**Date:** 2026-07-07
**Status:** Approved (brainstorm)

## Overview

A new scan flow that turns **two screenshots** of the player's own team into a **saved team** with full details per Pokemon: species, ability, item, 4 moves, SP values, and nature. It complements the existing opponent team scan (species-only) by reading the two in-game team detail screens:

- **Moves screen** (能力 / "Moves & More"): 6 panels, each with header sprite, nickname, gender/type icons, ability name, item icon + name, and 4 move rows (type icon + name).
- **Stats screen** (狀態 / "Stats"): the same 6 panels, each with 6 stat rows (final stat value + SP value).

Both known layouts are supported — the player's own team check screen and the "Replicate This Battle Team?" rental screen — because the six purple panels are structurally identical; only the chrome around them differs.

Recognition is **fully local** (approach A), consistent with the existing scan pipeline: ONNX sprite classifier + descriptor fallback, glyph-template digit reading, and candidate-constrained text matching. No network calls.

## Goals

- Scan two screenshots (any order) → review screen → save as a team on the Teams page.
- Fields captured per slot: species, ability, item, moves (4), SP per stat (6), nature.
- Languages: English, Japanese, Simplified Chinese, Traditional Chinese — auto-detected per scan.
- Tolerate a single screenshot: produce a partial team (missing fields default) with a notice.
- Every low-confidence or inconsistent field is correctable in the review UI before saving.

## Non-goals (v1)

- Tera type badge reading, gender capture.
- Opponent-side use of these screens (this flow is player-team only).
- Loading scan results directly into the damage calculator (saved teams already flow there).
- OCR of nicknames (species comes from the sprite; nicknames are ignored).

## Why the recognition problem is small

Every text field on these screens has a **closed, tiny candidate set**, so "read arbitrary CJK/EN/JA text" reduces to "pick the best of a few known strings":

| Field | Candidates | Source of constraint |
|---|---|---|
| Species | — (image) | Existing ONNX classifier / descriptor on header sprite |
| Ability | ≤3 names | `pokemon_abilities` for the classified species |
| Move (per row) | ~5–20 names | `pokemon_moves` learnset ∩ move-row **type icon** |
| Item | — (image) | Icon match vs bundled `public/images/items/*.png` sprites |
| Stat / SP values | digits 0–9 | Glyph templates, same technique as the HP reader (`hpText.ts`) |
| Nature | 25, derived | Solved from stat math — see below |

### Nature from two independent signals: arrows + stat math

The stats screen marks nature directly on each non-HP stat row: a **red up arrow = ×1.1** (boosted), a **blue down arrow = ×0.9** (hindered), **no arrow = neutral** for that stat (neutral natures show no arrows at all). Arrow reading is a color/shape check next to the stat label — language-free and cheap.

Independently, Champions stat formulas (already in `src/features/pokemon/utils/champions-stats.ts`) are invertible at Lv50/IV31:

- `HP = base + 75 + spHp` → cross-check for the HP row.
- `stat = floor((base + 20 + sp) × m)`, `m ∈ {0.9, 1.0, 1.1}` → with `base` known (classified species), `stat` and `sp` read from the screen, exactly one `m` fits per row.

The merge step reads **both**: arrows give the claimed multiplier per row; the math gives the observed one.

- **Agree** → nature locked with high confidence. The boosted/hindered stat pair maps to the exact nature; no arrows anywhere means a neutral nature (default `Serious`, matching existing import behavior).
- **Disagree, or no multiplier fits the digits** → a digit misread or wrong species classification is detected. If the arrow-implied multiplier plus one of the two digit reads yields a consistent row (e.g. SP + arrow reproduce a stat one digit off), the row is auto-repaired and marked low-confidence; otherwise the slot's stats are flagged in the review UI.

## Pipeline

```
2 images (any order)
  │ per image, on ingest:
  ├─ gameRect inference (reuse) → normalize frame
  ├─ playerPanels: find 6 purple panels (2×3 grid, slot = reading order),
  │     classify image as 'moves' | 'stats', carve sub-regions
  ├─ species: classifier/descriptor on header sprite (reuse)
  ├─ moves image: itemIcon match, textMatch for ability + 4 move rows
  └─ stats image: statDigits for 6 × (stat, sp, arrow up/down/none)
  │
  merge (mergePlayerScan):
  ├─ pair panels across images by slot index, cross-check species sprites agree
  ├─ nature per slot: arrows vs stat-math inversion, cross-validated; validate HP row
  ├─ language vote: per-language aggregate text-match score across all rows → argmax
  └─ produce 6 × PlayerSlotResult { candidates + confidence per field }
  │
  review UI (PlayerScanModal) → user corrections → PokemonConfig[6] → createTeam()
```

### Language auto-detection

Text matching runs against all four vocabularies for each text region; the language whose candidates score best **in aggregate across the whole scan** (~24 move rows + 6 abilities is a strong signal) wins, and per-field results from that language are used. One language per scan; both images share it.

### Text matching (`textMatch.ts`) — the one novel technique

1. Crop the text region, binarize (light text on purple panel → threshold), trim, scale to a fixed height.
2. Render each candidate string to an offscreen canvas in a system font at the same height, binarized the same way.
3. Compare with shape features robust to font differences (column-density profile + dhash-style bits on the binarized bitmaps); return ranked candidates with scores.

Candidates are rendered on demand and cached per (string, language) — no prebuilt text atlas. This is the risky module; see Risks.

## UX

**Entry:** Teams page gets a "Scan my team" action alongside the existing "Scan team" (opponent) entry. It opens a new `PlayerScanModal`.

**Flow:**
1. Modal shows two ingest slots ("Moves screen" / "Stats screen") fed by the existing `CaptureSource` seam (file picker, companion camera, capture). Order doesn't matter — each image is auto-classified and lands in the right slot; adding two moves-screens is reported as an error on the second.
2. Each image scans on ingest with per-image status; crop-and-retry is available as in the opponent modal.
3. Review screen: 6 editable cards showing sprite + species, ability, item, moves, SP spread, nature. Uncertain fields (score margin below threshold, or stat-math inconsistency) are highlighted with candidate dropdowns — same correction-UI spirit as the opponent scan. SP and nature are editable numerically/by picker.
4. "Save team" prompts for a name (same as Showdown import) and calls `createTeam()` with full `PokemonConfig` members. Done state links to the team.

**Partial scan:** with only one image, the review screen shows what was read and marks the other half "not scanned"; saving is allowed and missing fields take defaults (empty moves/item/ability or SP 0 / Serious).

## Output mapping

The merge step builds `PokemonConfig` directly (species id, base stats, and types from the DB; matched ability/item/move names; `spHp..spSpe`; nature) rather than round-tripping through `ParsedShowdownSet` — the scan already knows exact DB entities, so the Showdown fuzzy matchers are unnecessary here. Moves resolve to `MoveData` via the moves repository.

## Data changes

- **Add `name_zh_hans` to `moves` and `abilities`** (and `pokemon` if convenient, though species names are unused by this feature), imported from official localized data. Both DB copies must be updated (root `vgc_pokemon.db` and `public/` copy — see existing sync convention).
- **Prebuild `item-descriptors.json`**: descriptors (existing `fingerprint.ts` format) for each bundled item sprite, generated by a build script like `reference-descriptors.json`.

## New modules

All under `src/features/scan/`, mirroring existing style; each ships with unit tests against golden crops:

| Module | Responsibility |
|---|---|
| `playerPanels.ts` | Detect 6 panels, classify moves/stats screen, carve sub-regions |
| `statDigits.ts` | Read (stat, sp, nature arrow) per stat row: glyph-template digits + red-up/blue-down arrow detection |
| `textMatch.ts` | Binarize crop, render candidates, shape-match, rank |
| `itemIcon.ts` | Match item icon crop vs prebuilt item descriptors |
| `mergePlayerScan.ts` | Pair panels, nature solver, language vote, confidence, build `PokemonConfig` |
| `usePlayerTeamScan.ts` | Hook: two-image state machine, per-image status |
| `PlayerScanModal.tsx` | Modal UI (ingest, review cards, save) |

Reused untouched: `classifier.ts`, `fingerprint.ts`, `match.ts`, `gameRect.ts`, `imageLoading.ts`, CaptureSource implementations, `useTeams`/`createTeam`.

## Testing

- **Golden screenshots**: the four reference images (zh-Hant team check ×2, EN rental ×2) plus the user's own captures, checked into the test fixtures as with the HP-reader workflow. End-to-end assertions: full expected team (species, ability, item, moves, SP, nature) per image pair.
- **Unit tests per module**: panel boxes/regions on goldens; digit and arrow reads (the golden images cover boosted, hindered, and neutral rows); text match top-1 accuracy per language on cropped rows; nature solver (pure math — exhaustive over sp 0–32 × 25 natures, plus arrow/math disagreement and auto-repair cases); merge pairing and mismatch flagging.
- **In-app verification**: manual pass in the browser with the golden images through the modal, per the established scan-verification routine.

## Risks

1. **Text-shape matching across fonts** (game font vs canvas system font) is unproven. Mitigations: tiny candidate sets, normalization, golden tests from day one. Contained fallback if a language underperforms: a per-language glyph atlas extracted from screenshots (the HP-reader path, generalized).
2. **Item icons that look alike** at panel resolution. Mitigation: correction UI; icon descriptor tie-break by item-name text match as a follow-up if goldens show real collisions.
3. **Photos of the screen** (vs clean captures): handled by the existing `gameRect` inference and crop-and-retry, same as the opponent scan.
4. **zh-Hans data availability**: official Simplified names exist in public localized datasets; if an entry is missing, fall back to character-level Trad→Simp conversion for matching purposes only.
