# Spec 5 — Opponent Team Scan (on-device image recognition)

**Date:** 2026-06-30
**Status:** Design approved — ready for implementation planning
**Feature:** Scan a Pokémon Champions *team-select* screenshot and recognize the
**opponent's** 6 Pokémon, fully on-device, then build a saved team from them.

**Recognition engine (two phases):**
- **Phase 1 — descriptor matcher.** A pure-JS 4-channel nearest-neighbor over the
  bundled Champions menu sprites. In-domain by construction, ~130 KB, no ML. Ships first.
- **Phase 2 — tiny in-domain classifier.** A small CNN (ShuffleNetV2 / MobileNetV3,
  ~1–9 MB ONNX) **trained on SV-style menu sprites** (incl. forms as classes), run via
  onnxruntime-web. Added only if it beats Phase 1 on real screenshots. The descriptor
  matcher remains the offline **fallback**.

---

## 1. Goal & scope

From a screenshot of the Champions **"Select 4 Pokémon"** team-select screen,
identify the six Pokémon on the **opponent's side** (red tiles — sprite + type icons
only, no names) and turn them into a new saved team that flows into the existing
damage-calculator / teams machinery.

### Decisions locked during brainstorming
- **What:** import the **opponent's** team (the hidden, high-value scouting target).
- **Where it runs:** **fully on-device / offline** — no network at scan time, no API, no key.
- **Capture + locate:** **auto-detect** the 6 sprite regions from a picked screenshot.
- **Recognition engine:** **descriptor matcher first; tiny in-domain classifier as the
  Phase-2 booster.** We *rejected* bundling an off-the-shelf 1025-class **ViT** — both
  ready-made models (`skshmjn`, `JJMack`) are ViT-base trained on **artwork** (~85 MB,
  wrong domain for tiny menu sprites; `JJMack` is also NonCommercial). Instead, train a
  small CNN on the **actual sprite style** — lighter (~1–9 MB) *and* in-domain.
- **Reference / training sprites:** the **Champions menu sprites** (`Menu_CP`, SV-style,
  128×128), supplemented for training by **PokeSprite v2** (1025 species + 1594 form
  entries, `dex.json` manifest) and PokeAPI menu sprites. *IP note:* sprite images are
  Nintendo IP (fan-use) — fine for on-device training/inference; a trained model's
  weights are more distributable than the raw ripped sprites; confirm before any
  commercial release.
- **Resolver:** **reuse the existing import path as-is** (surgical) — scan produces
  `ParsedShowdownSet[]` and routes through the existing team-create handler. The
  pre-existing duplicated species→config resolver is **not** refactored here.

### Build sequencing
1. **Phase 1 — descriptor-only pipeline.** Red-tile detection, crop, the 4-channel
   matcher (format-scoped global search over the Champions menu sprites), confirm UI,
   team build. A complete, working, tiny, in-domain, form-aware feature — and the fallback.
2. **Phase 2 — tiny classifier.** Train ShuffleNetV2/MobileNetV3 on SV-style menu
   sprites with capture-augmentation, export ONNX, run via onnxruntime-web. **A/B-test
   it on the golden screenshots and keep it only if it beats Phase 1.**

### Out of scope (v1)
- Reading the **type icons** on opponent tiles (planned **v1.1** booster).
- Items / moves / EVs (opponent tiles don't expose them).
- Your **own** (blue) side — text, better served by OCR later.
- 3D battle-screen recognition.
- Refactoring the duplicated species→config resolver (tracked separately).

---

## 2. Why this approach

Pokémon Champions renders team-select opponents as small, clean, axis-aligned
**SV-style 2D menu sprites** (3D-model-derived box icons — confirmed against the
provided screenshots, *not* classic pixel dot sprites) in a consistent column of
saturated-red rounded tiles.

The key realization from the model hunt: **the bottleneck is domain match, not model
capacity.** Every off-the-shelf 1025-class model is trained on full-body artwork and
mis-handles tiny menu sprites. So:

- **Descriptor matcher (Phase 1).** The 4-channel fingerprint (dHash + RGB16 +
  silhouette + edge) nearest-neighbor is **in-domain by construction** — the reference
  set *is* the menu sprites. ~0 KB beyond a ~50–130 KB precomputed blob. Form-aware via
  `pokemon.id`. This alone may suffice.
- **Tiny classifier (Phase 2).** If Phase 1's accuracy on visually similar sprites
  isn't enough, a small CNN **trained on the menu sprites** (with augmentation that
  mimics the 64–96 px-then-upscaled capture) closes the gap at ~1–9 MB — 10–60× smaller
  than the ViT. Because we own the label set, **forms are first-class classes**, so it
  outputs the exact `pokemon.id` directly. Recipe + tooling already exist:
  **[txfs19260817/Pokemon-sprites-classifier](https://github.com/txfs19260817/Pokemon-sprites-classifier)**
  is a VGC-community project that trains ShuffleNetV2/MobileNet on sprites, exports
  ONNX, and even ships a tool to crop team-preview screenshots.

OpenCV.js, a native TFLite/ML-Kit plugin, and the artwork ViT were all rejected
(footprint / domain / no mature Capacitor plugin).

---

## 3. Architecture

New code lives in **`src/features/scan/`**. Per-pixel work and classifier inference run
in a **Web Worker**.

```
src/features/scan/
  segmentation.ts        # HSV red-tile detection + queue-based connected components
  fingerprint.ts         # dHash + RGB16 + silhouette + edge — SHARED by runtime & build script
  match.ts               # format-scoped weighted NN + shiny re-rank (Phase 1 + fallback)
  classifier.ts          # Phase 2: loads the tiny ONNX model, runs format-masked inference
  classMap.ts            # class-index → pokemon.id table + format-legal logit mask
  scan.worker.ts         # runs segmentation, classifier, and fingerprinting off-thread
  useTeamScan.ts         # hook: capture → detect → recognize → results
  ScanTeamModal.tsx      # confirm/correct UI; onImport(sets: ParsedShowdownSet[])
  __fixtures__/          # real labeled team-select screenshots for regression tests

public/images/pokemon/reference-descriptors.json   # Phase 1 descriptors + class-index→id map
public/models/pokemon-sprite-net/model.onnx        # Phase 2 tiny CNN (~1–9 MB); bundled
```

- **Phase 1 dependency:** none (pure Canvas/JS).
- **Phase 2 dependency:** **`onnxruntime-web`** (~10–11 MB WASM) to run the custom CNN
  (a hand-trained ShuffleNet/MobileNet isn't an HF architecture, so we use ORT directly
  with our own preprocessing: resize, normalize mean/std 0.5). Configure for offline
  (local `.wasm` + model). One reused session; dispose tensors promptly.
- `@capacitor/camera` added for pick-from-gallery / take-photo; `<input type="file">`
  is the dev-browser fallback.
- **Critical invariant:** `fingerprint.ts` is imported by **both** the runtime matcher
  and the build-time generator, so reference and query descriptors are bit-compatible.

---

## 4. Recognition pipeline (screenshot → built team)

| Step | What happens |
|------|--------------|
| **0. Input** | `@capacitor/camera` → `<img>` → offscreen canvas → `getImageData`. |
| **1. Find red tiles** | RGB→HSV; **adaptive** saturated-red threshold from the image's own dominant red cluster; morphological close; **queue-based** (never recursive) connected components; keep blobs matching the "6 evenly-spaced tiles in a column" prior. Ignores facecams / browser chrome. |
| **2. Crop sprites** | Crop the sprite inset from each tile; resize to the recognizer's input size. |
| **3. Recognize** | **Phase 1:** compute the 4-channel fingerprint and weighted nearest-neighbor over the **format-legal** menu sprites (`getPokemonListByFormat(activeFormat)`), returning top-3 `pokemon.id`s. **Phase 2 (if enabled & confident):** run the tiny CNN, **mask** logits to format-legal ids, softmax, take top-3 — outputs the exact form id directly (forms are classes). |
| **4. Shiny re-rank** | Thin top-1/top-2 margin ⇒ re-rank on hue-invariant channels (dHash + silhouette + edge), so shiny recolors don't break it. |
| **5. Confirm / correct** | 6-slot column mirroring the screenshot; top-1 pre-selected; top-3 alternates; sibling forms surfaced; low-confidence flagged; full `PokemonSearchSelect` override. **Never auto-commit.** |
| **6. Build team** | Emit 6 resolved `pokemon.id`s as species-only `ParsedShowdownSet[]` → existing resolver → `useTeams.createTeam` → `navigate(/teams/:id)`. |

### The 4-channel fingerprint (Phase 1 + fallback)
`dHash` (64-bit, Hamming) + `RGB16` (16×16 normalized RGB, cosine) + `silhouette`
(8×8 alpha grid, hue-invariant) + `edge` (8×8 Sobel, hue-invariant).
`score = w1·(1 − hamming/64) + w2·cosine(rgb16) + w3·cosine(sil) + w4·cosine(edge)`.
Weights tuned on the golden-screenshot set.

---

## 5. Data model mapping (existing schema)

- Each species **and every form/mega/regional variant is its own `pokemon` row**,
  keyed by `id` = national-dex id. **Base species `1–1025`; alternate forms `≥ 10000`.**
  Rows have `id` + `identifier` only — no species-grouping column.
- Recognition resolves to a single `pokemon.id`. The descriptor reference set and the
  classifier's class set are **both keyed to `pokemon.id`**, so forms (Rotom-Heat vs
  -Wash, Alolan, Urshifu styles, Landorus-Therian) are distinct entries/classes.
- The build step emits a **class-index → `pokemon.id`** table. The classifier's label
  list is generated by joining the **PokeSprite v2 `dex.json` manifest** (which enumerates
  species + forms by slug) to `pokemon.identifier` — **not** by naive `split('-')`, which
  trips on `mr-mime`, `ho-oh`, `type-null`, `tapu-koko`, `nidoran-f`,
  `urshifu-single-strike`. Irregular cases get a hand-curated map.
- **Types** are inline on the row (`type1`/`type2`) — ready for the v1.1 type-icon soft prior.

---

## 6. Integration seam (reuse existing flows)

- **Entry point:** a new **"Scan Team"** button on the Teams list page
  (`src/pages/Teams/index.tsx`), sibling to "Import Team". A scanned team becomes a
  **new saved team** via `createTeam(name, members)` + `navigate(/teams/:id)` — the
  exact tail of `handleImportTeam`. *Not* TeamDetail's flow (it overwrites).
- **`ScanTeamModal`** mirrors `TeamShowdownImportModal`'s contract; `onImport` yields
  `ParsedShowdownSet[]` (species filled; item/ability null, moves `[]`, EVs 0) so it
  flows through the **existing** resolver and create path untouched.
- **Persistence:** always via `useTeams.createTeam/updateTeam` — never `teamRepository`
  directly.
- **Format scoping:** `activeFormat` from `FormatContext` drives the descriptor
  candidate set **and** the classifier logit mask. Mismatch ⇒ the UI nudges the user to
  set the format to the opponent's regulation.

---

## 7. Error handling, fallback & edge cases

**Two-tier fallback (descriptor pipeline always present):**
1. **Classifier load/runtime failure** (ORT-web WASM init fails, OOM, unsupported
   WebView) → run **Phase 1 descriptor search** only. Feature still works.
2. **Per-tile low classifier confidence** (top-1 below threshold or thin margin) →
   fall back to the descriptor search **for that tile** and flag it in the confirm UI.

If Phase 2 is never shipped (Phase 1 deemed sufficient), the descriptor matcher *is* the
engine — no fallback logic needed.

**Other paths (all graceful):**
- **No / fewer than 6 tiles** → friendly "couldn't find the opponent column" + pick-again;
  fill found tiles, leave the rest as empty slots to complete manually.
- **Form ambiguity / near-identical sprites** → sibling forms appear as alternates; v1.1
  type icons tighten this.
- **Shiny** → hue-invariant re-rank (and augment shinies into training if Phase 2).
- **Format mismatch** → many low-confidence slots ⇒ hint the active format may differ.
- **Camera permission denied** → fall back to gallery / file picker.

### Confirm UI
A 6-slot vertical list mirroring the screenshot. Each slot: the cropped tile next to the
matched `PokemonImage` + name + confidence chip, with alternates and an "edit → search"
override. Bottom: editable team name (default "Scanned Team") + **Create Team**.

---

## 8. Build steps

**A. Descriptor + class-map generation** — `scripts/generate-sprite-descriptors.ts`, run
manually from repo root via `npx tsx`. Reads the bundled Champions `Menu_CP` sprites,
computes the **shared** `fingerprint.ts` descriptors, and emits
`public/images/pokemon/reference-descriptors.json` (keyed by string id, ~50–130 KB) plus
the **class-index → `pokemon.id`** table. Not wired into `npm run build`.

**B. Tiny-classifier training** *(Phase 2; manual, offline, documented in
`scripts/train-sprite-net.md`)*:
1. **Assemble dataset** — SV-style menu sprites for all format-relevant species **and
   forms**: Champions `Menu_CP` + PokeSprite v2 (`dex.json` manifest) + PokeAPI menu
   sprites. Label list joined to `pokemon.id` (§5).
2. **Augment to match capture** — downscale each sprite to 64–96 px then upscale with the
   same interpolation as the capture path, add mild JPEG/anti-alias/edge artifacts, small
   translations/pad, slight hue/brightness jitter. *This is the critical accuracy lever.*
3. **Train** ShuffleNetV2 (default) or MobileNetV3 via the txfs recipe (resize input,
   normalize mean/std 0.5); ~1 GPU-hour.
4. **Export ONNX** (`model_export.py`), int8-quantize, place under
   `public/models/pokemon-sprite-net/`. Snapshot the class-index→id map alongside.

---

## 9. Testing (Vitest, colocated `*.test.ts`, run from repo root)

1. **Unit (pure functions)** — `fingerprint` (Hamming symmetric & 0 for identical; RGB
   cosine = 1 for identical); `segmentation` (exactly 6 blobs on a synthetic 6-tile
   canvas; rejects a stray red rect); `match` scoring + shiny re-rank.
2. **Class-map / mask correctness** — every classifier class maps to a valid
   `pokemon.id`; the format mask keeps exactly the format-legal ids; the hyphen-trap
   species map correctly.
3. **Descriptor coverage integrity** (like `champions-dataset.test.ts`) — every
   format-legal `pokemon.id` has a descriptor with all 4 channels at correct lengths.
4. **Golden-screenshot regression** (the real accuracy gate) — a small labeled set of
   **real** Champions team-select screenshots in `__fixtures__`; assert top-3 contains
   the truth and the correct final id per slot, above thresholds. Include shiny,
   regional, Rotom, Urshifu, Landorus cases. **This is the Phase-2 A/B gate: the
   classifier ships only if it beats descriptor-only here.**
5. **Format-scoping** — a species legal only in another regulation is excluded for the
   active format (descriptor candidate set + classifier mask).

> Fresh worktrees need `npm install --legacy-peer-deps` before `npm test`.

---

## 10. Risks & open questions

- **Sprite-style match (the real lever).** Train/reference on **SV-style** menu icons
  matching Champions, not classic dot sprites. Confirmed against the screenshots, but
  validate the `Menu_CP` set renders like the live tile; harvest in-distribution crops
  from real screenshots for any mismatch.
- **Augmentation realism (Phase 2).** Accuracy hinges on simulating the 64–96 px-upscale
  capture in training; under-augmenting yields a model that aces pristine sprites and
  fails on captures. Validate on golden fixtures.
- **Near-identical forms** (color-only differences) challenge both engines; the confirm
  UI + sibling alternates are the backstop; v1.1 type icons help.
- **Label-set expansion** — the txfs shipped weights cover ~102 species; we expand to
  all format-relevant species + forms via the PokeSprite v2 manifest. A coverage test
  guards the class→id map.
- **Training effort** — Phase 2 needs a dataset-assembly + one training run (the recipe
  and datasets exist). Phase 1 needs none, which is why it ships first.
- **Layout-prior fragility** — assumes a fixed column of ~6 red tiles; confirm Champions
  doesn't vary it (scrolling/scaling/animations) against real captures.
- **IP** — sprite images are Nintendo fan-use; fine for on-device training/inference;
  confirm before any commercial release.

---

## 11. Footprint & runtime budget

- **Phase 1:** ~50–130 KB descriptor blob + ~0 KB matcher. Match <5 ms/tile.
- **Phase 2 (if shipped):** tiny CNN **~1–9 MB** (int8) + **onnxruntime-web WASM ~10–11 MB**
  ≈ **~12–20 MB total added** — small enough to **bundle directly in the APK** (no
  first-run download needed). Tiny-CNN inference is fast (~tens of ms/tile); modest RAM.
  Ship only the one ORT-web WASM variant needed.
- This is ~5–8× lighter than the rejected ViT plan (~95–105 MB) and removes the model-
  delivery question entirely.

---

## 12. Follow-ups (not in this spec)
- **v1.1 — type-icon reader:** crop the 1–2 type icons per tile, classify by
  nearest-centroid color (+ white-symbol shape tie-break for blue / yellow-green / purple
  collisions), apply as a **soft** candidate prior for tighter disambiguation.
- **Resolver cleanup:** extract the duplicated species→config block into one shared
  `resolveSetsToConfigs.ts` helper (tracked separately).
