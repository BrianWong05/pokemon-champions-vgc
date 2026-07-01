# Sprite Classifier v2 — Both-Player Scan + HP% Reading

Date: 2026-07-02
Branch: feat/opponent-team-scan (continues the Phase 1/2 scan work)

## Goal

Classify the mini-sprites of **both players'** Pokémon in two scenarios —
team preview and in-battle — and read the **HP percentage text** of battle
nameplates, all on-device, to drive the Damage Calculator in real time.

## Decisions made during brainstorming

- **Battle targets**: nameplate mini-sprites only (opponent top-right AND
  player bottom-left). Not the 3D arena models.
- **One classifier for everything**: same species classes regardless of
  scenario or side. No per-scenario models.
- **Square sprite crops everywhere**: team-preview mode must stop cropping
  the whole card (type/gender icons, wide aspect ratio hurt the model).
- **HP% via fixed-font glyph matching**, not Tesseract-style OCR and not
  bar-fill estimation as primary. The game font is fixed and the alphabet is
  11 glyphs (0-9, %), so template matching is exact and <5ms. Bar-fill kept
  as a cross-check only.
- **Training data policy**:
  - Keep the 213 clean `<id>.png` pokedex extracts (coverage + UI display).
  - Delete all 396 screenshot-derived `_Xnip` crops and **regenerate from
    the 76 source screenshots** in `training/screenshots/` with the new
    geometry (user chose clean regeneration over in-place transform, for
    full-resolution crops and consistent geometry; relabeling also captures
    the new player-side crops in the same pass).
  - Do NOT add official artwork / external thumbnails: different art domain,
    dilutes decision boundaries. The pokedex extracts are the in-domain
    clean art.
- **Red vs blue card backgrounds are acceptable nuisance variation**:
  uncorrelated with species, covered by both-side crops plus the existing
  `hue=0.5` jitter in training. Optional future augmentation: composite
  clean sprites over random solid backgrounds (only if evaluation shows
  background sensitivity).

## Components

### 1. Shared sprite-crop geometry
`spriteBoxFromTile(tile: TileBox): TileBox` — square, left-anchored on the
card, side ≈ `tile.h` with ~10% margin. Pure function in
`src/features/scan/cropMath.ts`, used by both the app scan pipeline
(`scanImage.ts`) and the labeler (`scripts/label-sprites-core.ts`).
Existing tile detection is untouched; this is a post-step.

### 2. Player-side detection
- **Team preview**: player card column on the LEFT half — same
  connected-component approach as `detectOpponentTiles` with a purple/blue
  mask instead of red, mirrored x-filter (`center < width * 0.5`).
- **Battle**: player nameplates at BOTTOM-LEFT — same panel-anchor trick as
  `detectBattleIcons` with a purple mask and region filter
  (`x < width * 0.55`, `y > height * 0.75`); icon sits left of the panel,
  same relative geometry.
- Labeler modes grow accordingly (`team` / `battle` each detect both sides;
  crops carry a side so the user can sanity-check, but the label format is
  unchanged — side is not part of the class).

### 3. Data regeneration
- Delete `public/images/pokemon/menu-sprites/*_Xnip*.png` (396 files).
- Re-run the labeling tool over `training/screenshots/` (76 files) with new
  geometry + player-side detection; output the same
  `<id>[_shiny]_<src>_<n>.png` naming into `menu-sprites/`.
- Descriptor rebuild (`generate-sprite-descriptors.ts`) re-run afterward so
  the current matcher keeps working until the CNN replaces it.

### 4. Training (existing script, unchanged)
`scripts/train_sprite_net.py` on Colab per its header: zip `menu-sprites/`,
train, export `model.onnx` + `classes.json` into
`public/models/pokemon-sprite-net/`. Evaluate with
`scripts/test_sprite_net.py` plus in-app scans of real screenshots.

### 5. HP% reader (no ML)
New `src/features/scan/hpText.ts`:
1. From a detected battle panel, locate the HP text row (fixed position
   relative to the panel).
2. Threshold the white outlined glyphs; split into glyph boxes via
   connected components.
3. Match each glyph against 11 stored templates (0-9, %) captured once from
   screenshots and stored as a small JSON asset.
4. Cross-check against HP-bar fill ratio; flag disagreement > 5%.
Applies identically to player panels (same font).

### 6. Damage-calc wiring
Extend the existing Damage Calc opponent-scan entry with battle mode:
detected icons → classifier → species; HP% → set current HP for the
corresponding side in the calc.

### 7. Post-validation cleanup (deferred)
Once the CNN is validated in-app, move screenshot-derived crops out of
`public/` into `training/` and retire the descriptor matcher's dependence
on them, slimming the shipped payload.

## Error handling

- Detection finding unexpected counts (team ≠ 6 per side, battle ≠ 2 per
  side) surfaces in the existing confirm/correct scan UI; never hard-fails.
- HP reader returns `null` when glyph matching is ambiguous (low match
  score) or cross-check disagrees; UI falls back to manual HP entry.
- Classifier keeps the existing legal-ids masking and top-N candidate UI
  for corrections.

## Testing

- Unit: `spriteBoxFromTile` geometry, player-side masks/filters against
  fixture screenshots, HP glyph segmentation + matching against fixture
  crops (at ≥2 source resolutions), cross-check disagreement path.
- Data: after regeneration, assert no wide-aspect crops remain in
  `menu-sprites/` and every `_Xnip` file parses to a valid id.
- Model: held-out accuracy via `test_sprite_net.py`; manual in-app scan of
  the two reference screenshots (team preview + battle) must produce
  correct species on both sides and correct HP%.

## Out of scope

- Classifying 3D arena models.
- OCR of anything beyond the HP percent text (names, move PP, timer).
- Server-side anything — all inference stays on-device.
