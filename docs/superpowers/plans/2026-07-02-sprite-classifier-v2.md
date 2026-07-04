# Sprite Classifier v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classify both players' mini-sprites (team preview + in-battle) and read HP% text on-device, feeding the Damage Calculator.

**Architecture:** Reuse the existing scan feature's detection/segmentation and ONNX classifier pipeline. Add: a shared square sprite-crop function, player-side detection (purple masks mirroring the opponent's red ones), a battle-detection module promoted from the labeler script into `src`, a fixed-font glyph reader for HP text, and a `detectScanTargets` orchestrator that the app hook and labeler both use. Then regenerate all screenshot-derived training crops and retrain the existing ShuffleNet on Colab.

**Tech Stack:** TypeScript + Vite + React, vitest, pngjs (scripts), onnxruntime-web, PyTorch/Colab (training, existing script).

**Spec:** `docs/superpowers/specs/2026-07-02-sprite-classifier-v2-design.md`

## Global Constraints

- All inference on-device; no server calls, no new model downloads except `public/models/pokemon-sprite-net/` (model.onnx + classes.json).
- Training data naming stays `<id>[_tags]_<src>_<n>.png`; class = part before first underscore.
- Keep the 213 clean `<id>.png` pokedex extracts untouched; only `*_Xnip*` crops are regenerated.
- No external art (official artwork / PokeAPI thumbnails) in training data.
- Sides are NOT part of the class label; one classifier serves both players and both scenarios.
- Existing opponent-side detection behavior must not regress (existing vitest suites keep passing, updated only where the plan says so).
- Tests: `npx vitest run <path>`. Type check: `npx tsc --noEmit`.

---

### Task 1: `spriteBoxFromTile` geometry

**Files:**
- Modify: `src/features/scan/cropMath.ts`
- Test: `src/features/scan/cropMath.test.ts` (append)

**Interfaces:**
- Produces: `export type SpriteAnchor = 'left' | 'right'` and
  `export function spriteBoxFromTile(tile: TileBox, bounds: Size, anchor?: SpriteAnchor): TileBox`
  — square box, side ≈ `1.1 × tile.h`, anchored at the tile's left or right end, vertically centered, clamped to `bounds`. Used by Tasks 2, 6, 9.

- [ ] **Step 1: Write the failing tests** (append to `cropMath.test.ts`; import `spriteBoxFromTile` from `./cropMath`)

```ts
describe('spriteBoxFromTile', () => {
  const bounds = { w: 1000, h: 800 };
  const tile = { x: 100, y: 200, w: 400, h: 80 };

  it('returns a square ~1.1x tile height', () => {
    const b = spriteBoxFromTile(tile, bounds, 'left');
    expect(b.w).toBe(88);
    expect(b.h).toBe(88);
  });

  it('anchors left with a small outward margin', () => {
    const b = spriteBoxFromTile(tile, bounds, 'left');
    expect(b.x).toBe(96); // 100 - round(80*0.05)
  });

  it('anchors right at the tile right edge', () => {
    const b = spriteBoxFromTile(tile, bounds, 'right');
    expect(b.x).toBe(100 + 400 - 88 + 4);
  });

  it('clamps to image bounds', () => {
    const b = spriteBoxFromTile({ x: 0, y: 0, w: 300, h: 100 }, { w: 320, h: 90 }, 'left');
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w).toBeLessThanOrEqual(320);
    expect(b.y + b.h).toBeLessThanOrEqual(90);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/features/scan/cropMath.test.ts` — expect FAIL (`spriteBoxFromTile` not exported).

- [ ] **Step 3: Implement** (append to `cropMath.ts`)

```ts
export type SpriteAnchor = 'left' | 'right';

/**
 * Square sprite region of a team-preview card. The mini-sprite sits at one end
 * of the card (opponent cards: left, player cards: right) and is roughly as
 * tall as the card; 1.1x side + small outward margin absorbs detection jitter.
 */
export function spriteBoxFromTile(tile: TileBox, bounds: Size, anchor: SpriteAnchor = 'left'): TileBox {
  const side = Math.round(tile.h * 1.1);
  const margin = Math.round(tile.h * 0.05);
  let x = anchor === 'left' ? tile.x - margin : tile.x + tile.w - side + margin;
  let y = tile.y - Math.round((side - tile.h) / 2);
  x = Math.max(0, Math.min(x, bounds.w - 1));
  y = Math.max(0, Math.min(y, bounds.h - 1));
  return {
    x,
    y,
    w: Math.max(1, Math.min(side, bounds.w - x)),
    h: Math.max(1, Math.min(side, bounds.h - y)),
  };
}
```

- [ ] **Step 4: Run** the test file again — expect PASS.

- [ ] **Step 5: Commit** — `git add src/features/scan/cropMath.ts src/features/scan/cropMath.test.ts && git commit -m "feat(scan): square sprite-crop geometry for card tiles"`

---

### Task 2: Player-side team-tile detection + sprite-box exports

**Files:**
- Modify: `src/features/scan/segmentation.ts`
- Test: `src/features/scan/segmentation.test.ts` (append)

**Interfaces:**
- Consumes: `spriteBoxFromTile` (Task 1).
- Produces (all from `segmentation.ts`):
  - `export function detectPlayerTiles(img: RgbaImage): TileBox[]` — up to 6 purple player cards on the LEFT half, top-to-bottom.
  - `export function detectOpponentSpriteBoxes(img: RgbaImage): TileBox[]` — `detectOpponentTiles` mapped through `spriteBoxFromTile(..., 'left')`.
  - `export function detectPlayerSpriteBoxes(img: RgbaImage): TileBox[]` — `detectPlayerTiles` mapped through `spriteBoxFromTile(..., 'right')`.

- [ ] **Step 1: Write the failing tests** (append to `segmentation.test.ts`)

```ts
import { detectPlayerTiles, detectOpponentSpriteBoxes, detectPlayerSpriteBoxes } from './segmentation';

describe('detectPlayerTiles', () => {
  it('detects 6 purple tiles stacked on the left side', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 40, 60 + k * 95, 260, 72, 90, 60, 200);
    const boxes = detectPlayerTiles(img);
    expect(boxes.length).toBe(6);
    for (let k = 1; k < boxes.length; k++) expect(boxes[k].y).toBeGreaterThan(boxes[k - 1].y);
  });

  it('ignores red opponent tiles on the right', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 900, 60 + k * 95, 260, 72, 220, 30, 40);
    expect(detectPlayerTiles(img).length).toBe(0);
  });
});

describe('sprite box helpers', () => {
  it('opponent sprite boxes are square and left-anchored on the tile', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 900, 60 + k * 95, 260, 72, 220, 30, 40);
    const tiles = detectOpponentSpriteBoxes(img);
    expect(tiles.length).toBe(6);
    for (const b of tiles) expect(Math.abs(b.w - b.h)).toBeLessThanOrEqual(1);
  });

  it('player sprite boxes are square and right-anchored on the tile', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 40, 60 + k * 95, 260, 72, 90, 60, 200);
    const boxes = detectPlayerSpriteBoxes(img);
    expect(boxes.length).toBe(6);
    // right-anchored: box right edge near the tile right edge (x=300)
    for (const b of boxes) expect(b.x + b.w).toBeGreaterThan(280);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/features/scan/segmentation.test.ts` — expect FAIL (missing exports).

- [ ] **Step 3: Implement in `segmentation.ts`**

3a. Parameterize `findPanelColumn` — add two params and thread them through (replace the current hardcoded predicate and right-half preference):

```ts
function findPanelColumn(
  img: RgbaImage,
  minCountRatio: number,
  minWidthRatio: number,
  maxGap: number,
  preferSide: 'left' | 'right',
  isColumnPixel: (r: number, g: number, b: number) => boolean,
): TileBox | null {
```

Inside, replace `isOpponentPanelColumnPixel(...)` with `isColumnPixel(...)`, and replace the `preferRightHalf` block with:

```ts
  const preferred = candidates.filter((b) =>
    preferSide === 'right' ? b.x + b.w / 2 > img.width * 0.5 : b.x + b.w / 2 < img.width * 0.5,
  );
  if (preferred.length > 0) candidates = preferred;
```

Update the two existing callers:

```ts
function findRightmostPanelColumn(img: RgbaImage): TileBox | null {
  return findPanelColumn(img, 0.08, 0.1, 3, 'right', isOpponentPanelColumnPixel);
}

function findEmbeddedPanelColumn(img: RgbaImage): TileBox | null {
  return findPanelColumn(img, 0.03, 0.055, Math.max(3, Math.round(img.width * 0.025)), 'right', isOpponentPanelColumnPixel);
}
```

3b. Parameterize the expansion side in `boxesFromPanelColumn` (the sprite pokes out of the card toward its anchored end):

```ts
function boxesFromPanelColumn(
  img: RgbaImage,
  column: TileBox,
  isRowPixel = isOpponentPanelRowPixel,
  expandSide: 'left' | 'right' = 'right',
): TileBox[] {
```

and replace the two `expandedX` / `expandedRight` lines with:

```ts
  const bigPad = Math.round(column.w * 0.25);
  const smallPad = Math.round(column.w * 0.02);
  const expandedX = Math.max(0, column.x - (expandSide === 'left' ? bigPad : smallPad));
  const expandedRight = Math.min(img.width - 1, column.x + column.w - 1 + (expandSide === 'right' ? bigPad : smallPad));
```

3c. Add player predicates, mask, and detector (after the opponent ones):

```ts
function isPlayerPanelColumnPixel(r: number, g: number, b: number): boolean {
  // Player cards are BLUE/PURPLE-dominant — the mirror of the opponent's red.
  return b > 110 && b > r + 30 && b > g + 50;
}

function isPlayerPanelRowPixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  const purple = h >= 225 && h <= 290 && s >= 0.3 && v >= 0.2;
  return purple || isPlayerPanelColumnPixel(r, g, b);
}

function purpleMask(img: RgbaImage): Uint8Array {
  const mask = new Uint8Array(img.width * img.height);
  for (let p = 0; p < mask.length; p++) {
    const i = p * 4;
    if (img.data[i + 3] > 0 && isPlayerPanelColumnPixel(img.data[i], img.data[i + 1], img.data[i + 2])) mask[p] = 1;
  }
  return mask;
}

export function detectPlayerTiles(img: RgbaImage): TileBox[] {
  const column = findPanelColumn(img, 0.08, 0.1, 3, 'left', isPlayerPanelColumnPixel);
  const panelBoxes = column ? boxesFromPanelColumn(img, column, isPlayerPanelRowPixel, 'left') : [];
  if (panelBoxes.length >= 4) return panelBoxes;

  const minArea = Math.max(50, Math.floor(img.width * img.height * 0.0005));
  const boxes = connectedComponents(purpleMask(img), img.width, img.height, minArea)
    .filter((b) => b.w > img.width * 0.08 && b.h > img.height * 0.03 && b.w / b.h > 1.1 && b.w / b.h < 8)
    .filter((b) => b.x + b.w / 2 < img.width * 0.5); // player column is on the left
  boxes.sort((a, b) => a.y - b.y);
  if (boxes.length >= 4 && boxes[0].y > img.height * 0.35) return [];
  return boxes.slice(0, 6);
}
```

3d. Add sprite-box exports (import `spriteBoxFromTile` from `./cropMath`):

```ts
export function detectOpponentSpriteBoxes(img: RgbaImage): TileBox[] {
  const bounds = { w: img.width, h: img.height };
  return detectOpponentTiles(img).map((t) => spriteBoxFromTile(t, bounds, 'left'));
}

export function detectPlayerSpriteBoxes(img: RgbaImage): TileBox[] {
  const bounds = { w: img.width, h: img.height };
  return detectPlayerTiles(img).map((t) => spriteBoxFromTile(t, bounds, 'right'));
}
```

- [ ] **Step 4: Run** `npx vitest run src/features/scan/segmentation.test.ts` — expect PASS (all existing opponent tests too).

- [ ] **Step 5: Real-screenshot check.** The purple thresholds in 3c are calibrated guesses. Verify against a real team-select screenshot before moving on:

```bash
npx tsx -e "
import { PNG } from 'pngjs'; import * as fs from 'fs';
import { detectPlayerTiles, detectOpponentTiles } from './src/features/scan/segmentation';
const f = process.argv[1];
const png = PNG.sync.read(fs.readFileSync(f));
const img = { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
console.log('player:', detectPlayerTiles(img).length, 'opponent:', detectOpponentTiles(img).length);
" training/screenshots/<a-team-select-screenshot>.png
```

Expected: `player: 6 opponent: 6`. If player < 4, sample actual card pixel RGB from the screenshot (e.g. with Preview's color picker or a 5-line pngjs dump) and adjust `isPlayerPanelColumnPixel` / `isPlayerPanelRowPixel` thresholds; re-run Steps 4–5.

- [ ] **Step 6: Commit** — `git commit -am "feat(scan): player-side team-tile detection + sprite-box crops"`

---

### Task 3: Promote battle detection to `src` with both sides

**Files:**
- Create: `src/features/scan/battleDetection.ts`
- Modify: `scripts/label-sprites-core.ts` (remove moved code, re-import)
- Test: `src/features/scan/battleDetection.test.ts` (new); existing `scripts/label-sprites-core.test.ts` must keep passing.

**Interfaces:**
- Produces (from `battleDetection.ts`):
  - `export type BattleSide = 'opponent' | 'player'`
  - `export function detectBattlePanels(img: RgbaImage, side: BattleSide): TileBox[]` — up to 2 nameplate panels, sorted by x. Panels are needed by the HP reader (Task 4).
  - `export function battleIconFromPanel(panel: TileBox, img: RgbaImage): TileBox`
  - `export function detectBattleIcons(img: RgbaImage, side: BattleSide): TileBox[]`
- `scripts/label-sprites-core.ts` keeps exporting `detectBattleIcons(img)` (opponent-only for now — Task 9 widens it) so its existing tests pass unchanged.

- [ ] **Step 1: Write the failing tests** (`src/features/scan/battleDetection.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { detectBattlePanels, detectBattleIcons } from './battleDetection';
import type { RgbaImage } from './types';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * img.width + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
}

describe('detectBattlePanels', () => {
  it('finds two magenta opponent panels top-right', () => {
    const img = blank(1250, 700);
    fillRect(img, 720, 30, 160, 40, 220, 40, 120);
    fillRect(img, 960, 30, 160, 40, 220, 40, 120);
    const panels = detectBattlePanels(img, 'opponent');
    expect(panels.length).toBe(2);
    expect(panels[0].x).toBeLessThan(panels[1].x);
  });

  it('finds two purple player panels bottom-left', () => {
    const img = blank(1250, 700);
    fillRect(img, 40, 600, 160, 40, 80, 60, 190);
    fillRect(img, 300, 600, 160, 40, 80, 60, 190);
    expect(detectBattlePanels(img, 'player').length).toBe(2);
  });

  it('does not cross sides', () => {
    const img = blank(1250, 700);
    fillRect(img, 720, 30, 160, 40, 220, 40, 120); // opponent-colored, opponent region
    expect(detectBattlePanels(img, 'player').length).toBe(0);
  });
});

describe('detectBattleIcons', () => {
  it('returns one square-ish icon crop per panel, left of the panel', () => {
    const img = blank(1250, 700);
    fillRect(img, 720, 30, 160, 40, 220, 40, 120);
    fillRect(img, 960, 30, 160, 40, 220, 40, 120);
    const icons = detectBattleIcons(img, 'opponent');
    expect(icons.length).toBe(2);
    expect(icons[0].x).toBeLessThan(720);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/features/scan/battleDetection.test.ts` — expect FAIL (module missing).

- [ ] **Step 3: Create `src/features/scan/battleDetection.ts`.** Move `battlePanelMask`, `clampBox`, `battleIconCropSize`, `battleIconFromPanel`, `detectBattleIcons` out of `scripts/label-sprites-core.ts`, generalized per side:

```ts
// src/features/scan/battleDetection.ts
import { connectedComponents } from './segmentation';
import type { RgbaImage, TileBox } from './types';

export type BattleSide = 'opponent' | 'player';

interface SideConfig {
  isPanelPixel: (r: number, g: number, b: number) => boolean;
  inRegion: (x: number, y: number, img: RgbaImage) => boolean;
}

// Nameplate panels are stable color anchors: opponent = magenta (top-right),
// player = indigo/purple (bottom-left). Anchoring on the plate avoids relying
// on HP fill color.
const SIDES: Record<BattleSide, SideConfig> = {
  opponent: {
    isPanelPixel: (r, g, b) => r > 150 && g < 115 && b > 70 && r > g + 60 && r > b + 15,
    inRegion: (x, y, img) => x > img.width * 0.45 && y < img.height * 0.22,
  },
  player: {
    isPanelPixel: (r, g, b) => b > 120 && b > g + 50 && b > r + 40,
    inRegion: (x, y, img) => x < img.width * 0.55 && y > img.height * 0.7,
  },
};

function panelMask(img: RgbaImage, cfg: SideConfig): Uint8Array {
  const mask = new Uint8Array(img.width * img.height);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (!cfg.inRegion(x, y, img)) continue;
      const i = (y * img.width + x) * 4;
      if (cfg.isPanelPixel(img.data[i], img.data[i + 1], img.data[i + 2])) mask[y * img.width + x] = 1;
    }
  }
  return mask;
}

export function detectBattlePanels(img: RgbaImage, side: BattleSide): TileBox[] {
  const cfg = SIDES[side];
  const minArea = Math.max(150, Math.floor(img.width * img.height * 0.0008));
  return connectedComponents(panelMask(img, cfg), img.width, img.height, minArea)
    .filter((b) =>
      b.w > img.width * 0.07 &&
      b.w < img.width * 0.3 &&
      b.h > img.height * 0.02 &&
      b.h < img.height * 0.12 &&
      b.w / b.h > 2 &&
      b.w / b.h < 9
    )
    .sort((a, b) => a.x - b.x)
    .slice(0, 2);
}

function clampBox(box: TileBox, img: RgbaImage): TileBox {
  const x = Math.max(0, Math.min(img.width - 1, box.x));
  const y = Math.max(0, Math.min(img.height - 1, box.y));
  return {
    x,
    y,
    w: Math.max(1, Math.min(box.w, img.width - x)),
    h: Math.max(1, Math.min(box.h, img.height - y)),
  };
}

function battleIconCropSize(panel: TileBox): number {
  const normalPanelSize = panel.h * 1.2;
  const embeddedPanelSize = Math.min(panel.h * 4, panel.w * 0.48);
  return Math.round(Math.max(normalPanelSize, embeddedPanelSize));
}

export function battleIconFromPanel(panel: TileBox, img: RgbaImage): TileBox {
  const size = battleIconCropSize(panel);
  return clampBox({
    x: panel.x - Math.round(size * 0.55),
    y: panel.y - Math.round((size - panel.h) * 0.25),
    w: size,
    h: size,
  }, img);
}

export function detectBattleIcons(img: RgbaImage, side: BattleSide): TileBox[] {
  return detectBattlePanels(img, side).map((p) => battleIconFromPanel(p, img));
}
```

Note: the old code filtered panels by `b.x > width*0.45 && b.y < height*0.2` *after* CC — that's now covered by `inRegion` at mask time; the size/aspect filters are kept verbatim.

- [ ] **Step 4: Update `scripts/label-sprites-core.ts`.** Delete `battlePanelMask`, `clampBox`, `battleIconCropSize`, `battleIconFromPanel`, and the old `detectBattleIcons`; replace with:

```ts
import { detectBattleIcons as detectSideBattleIcons } from '../src/features/scan/battleDetection';

export function detectBattleIcons(img: RgbaImage): TileBox[] {
  return detectSideBattleIcons(img, 'opponent');
}
```

(`detectLabelCrops` keeps calling the local `detectBattleIcons` unchanged.)

- [ ] **Step 5: Run** `npx vitest run src/features/scan/battleDetection.test.ts scripts/label-sprites-core.test.ts` — expect PASS.

- [ ] **Step 6: Real-screenshot check** for the player-side thresholds (same pattern as Task 2 Step 5):

```bash
npx tsx -e "
import { PNG } from 'pngjs'; import * as fs from 'fs';
import { detectBattlePanels } from './src/features/scan/battleDetection';
const png = PNG.sync.read(fs.readFileSync(process.argv[1]));
const img = { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
console.log('opp:', detectBattlePanels(img, 'opponent').length, 'player:', detectBattlePanels(img, 'player').length);
" training/screenshots/<an-in-battle-screenshot>.png
```

Expected: `opp: 2 player: 2`. Tune `SIDES.player` thresholds against sampled plate pixels if needed.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(scan): battle panel/icon detection in src with player side"`

---

### Task 4: HP glyph reader (`hpText.ts`)

**Files:**
- Create: `src/features/scan/hpText.ts`
- Create: `src/features/scan/hpGlyphTemplates.ts` (empty placeholder; Task 5 generates the real one)
- Test: `src/features/scan/hpText.test.ts`

**Interfaces:**
- Consumes: `rgbToHsv` from `./segmentation`, `TileBox`/`RgbaImage` from `./types`, `HP_GLYPH_TEMPLATES` from `./hpGlyphTemplates`.
- Produces:
  - `export interface GlyphTemplate { char: string; bits: string }` (bits = 256 chars of '0'/'1', 16×16 row-major)
  - `export interface HpReading { percent: number; current?: number; max?: number }`
  - `export interface BinMask { bits: Uint8Array; w: number; h: number }`
  - `export function whiteMask(img: RgbaImage, box: TileBox): BinMask`
  - `export function segmentGlyphs(mask: BinMask): TileBox[]` (column-projection; boxes in mask coords, sorted by x)
  - `export function clusterGlyphBoxes(boxes: TileBox[]): TileBox[][]`
  - `export function normalizeGlyph(mask: BinMask, box: TileBox): Uint8Array` (256 bits)
  - `export function matchGlyph(bits: Uint8Array, templates?: GlyphTemplate[]): string | null`
  - `export function parseHpText(text: string): HpReading | null`
  - `export function hpTextRegion(panel: TileBox, img: { width: number; height: number }): TileBox`
  - `export function measureHpBarFill(img: RgbaImage, panel: TileBox): number | null`
  - `export function readHpFromPanel(img: RgbaImage, panel: TileBox, templates?: GlyphTemplate[]): HpReading | null`
- `hpGlyphTemplates.ts` placeholder: `export const HP_GLYPH_TEMPLATES: Array<{ char: string; bits: string }> = [];` — with empty templates, `readHpFromPanel` returns `null` (HP reading silently off until Task 5).

- [x] **Step 1: Write the failing tests** (`src/features/scan/hpText.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import {
  parseHpText, segmentGlyphs, clusterGlyphBoxes, normalizeGlyph, matchGlyph, readHpFromPanel,
  type BinMask,
} from './hpText';
import type { RgbaImage } from './types';

function maskOf(rows: string[]): BinMask {
  const h = rows.length, w = rows[0].length;
  const bits = new Uint8Array(w * h);
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') bits[y * w + x] = 1; }));
  return { bits, w, h };
}

describe('parseHpText', () => {
  it('parses percent form', () => {
    expect(parseHpText('100%')).toEqual({ percent: 100 });
    expect(parseHpText('7%')).toEqual({ percent: 7 });
  });
  it('parses fraction form with exact hp', () => {
    expect(parseHpText('157/157')).toEqual({ percent: 100, current: 157, max: 157 });
    expect(parseHpText('40/160')).toEqual({ percent: 25, current: 40, max: 160 });
  });
  it('rejects garbage', () => {
    expect(parseHpText('')).toBeNull();
    expect(parseHpText('101%')).toBeNull();
    expect(parseHpText('200/100')).toBeNull();
    expect(parseHpText('07:00')).toBeNull();
  });
});

describe('segmentGlyphs', () => {
  it('splits glyphs on empty columns and keeps x order', () => {
    const mask = maskOf([
      '.##..#..##.',
      '.##..#..##.',
      '.##..#..##.',
      '.##..#..##.',
      '.##..#..##.',
    ]);
    const boxes = segmentGlyphs(mask);
    expect(boxes.length).toBe(3);
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
  });
});

describe('clusterGlyphBoxes', () => {
  it('splits boxes separated by a wide gap into clusters', () => {
    const g = (x: number) => ({ x, y: 0, w: 4, h: 8 });
    const clusters = clusterGlyphBoxes([g(0), g(6), g(12), g(60), g(66)]);
    expect(clusters.length).toBe(2);
    expect(clusters[0].length).toBe(3);
  });
});

describe('normalizeGlyph + matchGlyph roundtrip', () => {
  it('recognizes a glyph against a template built from itself', () => {
    const mask = maskOf(['####', '#..#', '#..#', '####']);
    const box = { x: 0, y: 0, w: 4, h: 4 };
    const bits = normalizeGlyph(mask, box);
    const template = { char: '0', bits: Array.from(bits).join('') };
    expect(matchGlyph(bits, [template])).toBe('0');
  });
  it('returns null when nothing is close', () => {
    const empty = new Uint8Array(256);
    const full = { char: '8', bits: '1'.repeat(256) };
    expect(matchGlyph(empty, [full])).toBeNull();
  });
});

describe('readHpFromPanel', () => {
  it('returns null with empty templates', () => {
    const img: RgbaImage = { data: new Uint8ClampedArray(100 * 100 * 4), width: 100, height: 100 };
    expect(readHpFromPanel(img, { x: 10, y: 10, w: 60, h: 12 }, [])).toBeNull();
  });
});
```

- [x] **Step 2: Run** `npx vitest run src/features/scan/hpText.test.ts` — expect FAIL.

- [x] **Step 3: Create `hpGlyphTemplates.ts` placeholder and implement `hpText.ts`:**

```ts
// src/features/scan/hpGlyphTemplates.ts
// GENERATED by scripts/build-hp-glyph-templates.ts — do not edit by hand.
export const HP_GLYPH_TEMPLATES: Array<{ char: string; bits: string }> = [];
```

```ts
// src/features/scan/hpText.ts
// Reads the HP text under a battle nameplate ("100%" opponent, "157/157" player)
// by matching the game's fixed font against stored glyph templates — exact and
// fast, no OCR engine. Bar fill is measured as a cross-check.
import { rgbToHsv } from './segmentation';
import { HP_GLYPH_TEMPLATES } from './hpGlyphTemplates';
import type { RgbaImage, TileBox } from './types';

export const GLYPH_SIZE = 16;
const MAX_HAMMING = 64;            // of 256 — above this a glyph is unknown
const BAR_DISAGREE_PCT = 12;       // glyphs vs bar-fill disagreement => distrust

export interface GlyphTemplate { char: string; bits: string }
export interface HpReading { percent: number; current?: number; max?: number }
export interface BinMask { bits: Uint8Array; w: number; h: number }

export function hpTextRegion(panel: TileBox, img: { width: number; height: number }): TileBox {
  const y = Math.min(img.height - 1, panel.y + panel.h);
  return {
    x: panel.x,
    y,
    w: Math.min(panel.w, img.width - panel.x),
    h: Math.max(0, Math.min(Math.round(panel.h * 1.8), img.height - y)),
  };
}

// Adaptive threshold: glyphs are the brightest thing in the region, but phone
// photos and video frames can be dim — threshold relative to the region's peak
// brightness instead of a fixed cutoff (floor keeps noise out of black regions).
export function whiteMask(img: RgbaImage, box: TileBox): BinMask {
  const bits = new Uint8Array(box.w * box.h);
  let peak = 0;
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = ((box.y + y) * img.width + (box.x + x)) * 4;
      const m = Math.min(img.data[i], img.data[i + 1], img.data[i + 2]);
      if (m > peak) peak = m;
    }
  }
  const thr = Math.max(120, Math.round(peak * 0.8));
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = ((box.y + y) * img.width + (box.x + x)) * 4;
      if (Math.min(img.data[i], img.data[i + 1], img.data[i + 2]) >= thr) bits[y * box.w + x] = 1;
    }
  }
  return { bits, w: box.w, h: box.h };
}

// Column projection instead of connected components: '%' is three strokes but
// has no fully-empty column inside it, so projection keeps it as one glyph.
export function segmentGlyphs(mask: BinMask): TileBox[] {
  const colHas: boolean[] = new Array(mask.w).fill(false);
  for (let x = 0; x < mask.w; x++) {
    for (let y = 0; y < mask.h; y++) if (mask.bits[y * mask.w + x]) { colHas[x] = true; break; }
  }
  const boxes: TileBox[] = [];
  let start = -1;
  for (let x = 0; x <= mask.w; x++) {
    const has = x < mask.w && colHas[x];
    if (has && start < 0) start = x;
    if (!has && start >= 0) {
      let y0 = mask.h, y1 = -1;
      for (let y = 0; y < mask.h; y++) {
        for (let gx = start; gx < x; gx++) {
          if (mask.bits[y * mask.w + gx]) { if (y < y0) y0 = y; if (y > y1) y1 = y; break; }
        }
      }
      const box = { x: start, y: y0, w: x - start, h: y1 - y0 + 1 };
      if (box.h >= 5 && box.w >= 2) boxes.push(box);
      start = -1;
    }
  }
  return boxes;
}

export function clusterGlyphBoxes(boxes: TileBox[]): TileBox[][] {
  if (boxes.length === 0) return [];
  const widths = boxes.map((b) => b.w).sort((a, b) => a - b);
  const medW = widths[Math.floor(widths.length / 2)];
  const clusters: TileBox[][] = [[boxes[0]]];
  for (let i = 1; i < boxes.length; i++) {
    const prev = boxes[i - 1];
    if (boxes[i].x - (prev.x + prev.w) > medW * 2) clusters.push([]);
    clusters[clusters.length - 1].push(boxes[i]);
  }
  return clusters;
}

export function normalizeGlyph(mask: BinMask, box: TileBox): Uint8Array {
  const out = new Uint8Array(GLYPH_SIZE * GLYPH_SIZE);
  for (let gy = 0; gy < GLYPH_SIZE; gy++) {
    for (let gx = 0; gx < GLYPH_SIZE; gx++) {
      const sx = box.x + Math.min(box.w - 1, Math.floor(((gx + 0.5) * box.w) / GLYPH_SIZE));
      const sy = box.y + Math.min(box.h - 1, Math.floor(((gy + 0.5) * box.h) / GLYPH_SIZE));
      out[gy * GLYPH_SIZE + gx] = mask.bits[sy * mask.w + sx];
    }
  }
  return out;
}

export function matchGlyph(bits: Uint8Array, templates: GlyphTemplate[] = HP_GLYPH_TEMPLATES): string | null {
  let bestChar: string | null = null;
  let bestDist = Infinity;
  for (const t of templates) {
    let d = 0;
    for (let i = 0; i < bits.length; i++) if (bits[i] !== t.bits.charCodeAt(i) - 48) d++;
    if (d < bestDist) { bestDist = d; bestChar = t.char; }
  }
  return bestDist <= MAX_HAMMING ? bestChar : null;
}

export function parseHpText(text: string): HpReading | null {
  const pct = /^(\d{1,3})%$/.exec(text);
  if (pct) {
    const percent = Number(pct[1]);
    return percent <= 100 ? { percent } : null;
  }
  const frac = /^(\d{1,4})\/(\d{1,4})$/.exec(text);
  if (frac) {
    const current = Number(frac[1]);
    const max = Number(frac[2]);
    if (max === 0 || current > max) return null;
    return { percent: Math.round((current / max) * 100), current, max };
  }
  return null;
}

export function measureHpBarFill(img: RgbaImage, panel: TileBox): number | null {
  const region = hpTextRegion(panel, img);
  let bestRun = 0;
  let trackW = 1;
  for (let y = region.y; y < region.y + region.h; y++) {
    let run = 0, maxRun = 0, first = -1, last = -1;
    for (let x = region.x; x < region.x + region.w; x++) {
      const i = (y * img.width + x) * 4;
      const [h, s, v] = rgbToHsv(img.data[i], img.data[i + 1], img.data[i + 2]);
      const filled = s > 0.45 && v > 0.35 && (h < 140 || h > 330); // green/yellow/red fill
      if (filled) { run++; if (run > maxRun) maxRun = run; } else run = 0;
      if (filled || v < 0.3) { if (first < 0) first = x; last = x; } // dark = empty track
    }
    if (maxRun > bestRun) { bestRun = maxRun; trackW = Math.max(1, last - first + 1); }
  }
  if (bestRun < panel.w * 0.1) return null;
  return Math.max(0, Math.min(1, bestRun / trackW));
}

export function readHpFromPanel(
  img: RgbaImage,
  panel: TileBox,
  templates: GlyphTemplate[] = HP_GLYPH_TEMPLATES,
): HpReading | null {
  if (templates.length === 0) return null;
  const region = hpTextRegion(panel, img);
  if (region.h < 4 || region.w < 4) return null;
  const mask = whiteMask(img, region);
  const clusters = clusterGlyphBoxes(segmentGlyphs(mask)).sort((a, b) => b.length - a.length);
  for (const cluster of clusters) {
    const chars = cluster.map((b) => matchGlyph(normalizeGlyph(mask, b), templates));
    if (chars.some((c) => c === null)) continue;
    const reading = parseHpText(chars.join(''));
    if (!reading) continue;
    const bar = measureHpBarFill(img, panel);
    if (bar != null && Math.abs(reading.percent - bar * 100) > BAR_DISAGREE_PCT) return null;
    return reading;
  }
  return null;
}
```

- [x] **Step 4: Run** `npx vitest run src/features/scan/hpText.test.ts` — expect PASS.

- [x] **Step 4b: Wire HP readings into battle scan targets** — added a red/green
  test in `src/features/scan/scanTargetsHp.test.ts`; `detectScanTargets` now
  attaches `readHpFromPanel(img, panel)?.percent ?? null` for each battle
  target. With the placeholder template file this stays `null` until Task 5
  generates templates.

- [x] **Step 5: Commit** — `git add src/features/scan/hpText.ts src/features/scan/hpGlyphTemplates.ts src/features/scan/hpText.test.ts && git commit -m "feat(scan): fixed-font HP text reader with bar-fill cross-check"`

---

### Task 5: Glyph-template builder script + real templates

**Files:**
- Create: `scripts/build-hp-glyph-templates.ts`
- Modify (generated): `src/features/scan/hpGlyphTemplates.ts`
- Create (generated, committed): `training/hp-glyph-templates.json` (source of truth so re-runs merge)

**Interfaces:**
- Consumes: `detectBattlePanels` (Task 3); `whiteMask`, `segmentGlyphs`, `clusterGlyphBoxes`, `normalizeGlyph`, `hpTextRegion` (Task 4).
- Produces: populated `HP_GLYPH_TEMPLATES` in `src/features/scan/hpGlyphTemplates.ts`.

- [x] **Step 1: Write the script**

```ts
// scripts/build-hp-glyph-templates.ts
/**
 * Build HP glyph templates from a battle screenshot with KNOWN HP text.
 *
 * Usage:
 *   npx tsx scripts/build-hp-glyph-templates.ts <screenshot.png> <side> <text-per-panel...>
 *   e.g. npx tsx scripts/build-hp-glyph-templates.ts training/screenshots/X.png opponent 100% 100%
 *        npx tsx scripts/build-hp-glyph-templates.ts training/screenshots/X.png player 157/157 177/177
 *
 * Panels are matched to the expected strings left-to-right. Templates merge into
 * training/hp-glyph-templates.json and regenerate src/features/scan/hpGlyphTemplates.ts.
 */
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import { detectBattlePanels, type BattleSide } from '../src/features/scan/battleDetection';
import { whiteMask, segmentGlyphs, clusterGlyphBoxes, normalizeGlyph, hpTextRegion } from '../src/features/scan/hpText';
import type { RgbaImage } from '../src/features/scan/types';

const JSON_PATH = path.resolve('training/hp-glyph-templates.json');
const TS_PATH = path.resolve('src/features/scan/hpGlyphTemplates.ts');

const [file, side, ...expected] = process.argv.slice(2);
if (!file || (side !== 'opponent' && side !== 'player') || expected.length === 0) {
  console.error('Usage: build-hp-glyph-templates.ts <screenshot.png> <opponent|player> <text-per-panel...>');
  process.exit(1);
}

const png = PNG.sync.read(fs.readFileSync(file));
const img: RgbaImage = { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
const panels = detectBattlePanels(img, side as BattleSide);
if (panels.length !== expected.length) {
  console.error(`Detected ${panels.length} ${side} panel(s) but got ${expected.length} expected string(s).`);
  process.exit(1);
}

const templates: Array<{ char: string; bits: string }> = fs.existsSync(JSON_PATH)
  ? JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'))
  : [];
let added = 0;

panels.forEach((panel, p) => {
  const mask = whiteMask(img, hpTextRegion(panel, img));
  const clusters = clusterGlyphBoxes(segmentGlyphs(mask)).sort((a, b) => b.length - a.length);
  const want = [...expected[p]];
  const cluster = clusters.find((c) => c.length === want.length);
  if (!cluster) {
    console.error(`Panel ${p}: expected ${want.length} glyphs ("${expected[p]}") but clusters have [${clusters.map((c) => c.length).join(', ')}] glyphs.`);
    process.exit(1);
  }
  cluster.forEach((box, i) => {
    const bits = Array.from(normalizeGlyph(mask, box)).join('');
    if (!templates.some((t) => t.char === want[i] && t.bits === bits)) {
      templates.push({ char: want[i], bits });
      added++;
    }
  });
});

fs.writeFileSync(JSON_PATH, JSON.stringify(templates, null, 1));
fs.writeFileSync(TS_PATH, `// src/features/scan/hpGlyphTemplates.ts
// GENERATED by scripts/build-hp-glyph-templates.ts — do not edit by hand.
export const HP_GLYPH_TEMPLATES: Array<{ char: string; bits: string }> = ${JSON.stringify(templates)};
`);
const chars = [...new Set(templates.map((t) => t.char))].sort().join('');
console.log(`Added ${added} template(s); ${templates.length} total covering: ${chars}`);
console.log('Coverage needed: 0123456789/% — run again on more screenshots for missing chars.');
```

- [ ] **Step 2: Run it on real battle screenshots** (repeat until all of `0123456789/%` are covered — pick screenshots with varied HP values):

```bash
npx tsx scripts/build-hp-glyph-templates.ts training/screenshots/<battle-shot>.png opponent 100% 100%
npx tsx scripts/build-hp-glyph-templates.ts training/screenshots/<battle-shot>.png player 157/157 177/177
```

Expected: `Added N template(s); ... covering: ...`. The user supplies the true HP strings per screenshot (visible in the image).

- [ ] **Step 3: Verify end-to-end on a screenshot NOT used for templates:**

```bash
npx tsx -e "
import { PNG } from 'pngjs'; import * as fs from 'fs';
import { detectBattlePanels } from './src/features/scan/battleDetection';
import { readHpFromPanel } from './src/features/scan/hpText';
const png = PNG.sync.read(fs.readFileSync(process.argv[1]));
const img = { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
for (const side of ['opponent', 'player']) {
  for (const p of detectBattlePanels(img, side)) console.log(side, JSON.stringify(readHpFromPanel(img, p)));
}
" training/screenshots/<other-battle-shot>.png
```

Expected: the HP values visible in that screenshot. If a glyph mismatches, add templates from that screenshot too (variants merge).

- [ ] **Step 4: Run** `npx vitest run src/features/scan` — expect PASS (templates change no behavior contracts).

- [ ] **Step 5: Commit** — `git add scripts/build-hp-glyph-templates.ts training/hp-glyph-templates.json src/features/scan/hpGlyphTemplates.ts && git commit -m "feat(scan): HP glyph template builder + in-domain templates"`

---

### Task 6: `detectScanTargets` orchestrator + scanImage/types rewiring

**Files:**
- Create: `src/features/scan/scanTargets.ts`
- Modify: `src/features/scan/types.ts`, `src/features/scan/scanImage.ts`
- Test: `src/features/scan/scanTargets.test.ts` (new); update `src/features/scan/scanImage.test.ts` expectations if they assert whole-tile boxes.

**Interfaces:**
- Consumes: `detectOpponentSpriteBoxes` (Task 2), `detectBattlePanels`/`battleIconFromPanel` (Task 3), `readHpFromPanel` (Task 4).
- Produces:
  - In `types.ts`: `export type ScanSide = 'player' | 'opponent'`; `SlotResult` gains `side?: ScanSide; hpPercent?: number | null`.
  - `export type ScanMode = 'team' | 'battle'`
  - `export interface ScanTarget { box: TileBox; side: ScanSide; hpPercent: number | null }`
  - `export function detectScanTargets(img: RgbaImage): { mode: ScanMode; targets: ScanTarget[] }`
  - `scanTeamImage(img, refs, topN)` keeps its signature but now routes through `detectScanTargets` (battle screenshots work in the descriptor engine too).
- **Decision recorded:** app-side team-preview scan stays opponent-only (the user knows their own team; existing UI flows build opponent rosters). Battle scan covers both sides. The labeler (Task 9) crops both sides in both modes for training data.

- [ ] **Step 1: Write the failing tests** (`src/features/scan/scanTargets.test.ts`; reuse the `blank`/`fillRect` helpers verbatim from Task 3's test file)

```ts
import { describe, it, expect } from 'vitest';
import { detectScanTargets } from './scanTargets';
// ... blank/fillRect helpers as in battleDetection.test.ts ...

describe('detectScanTargets', () => {
  it('classifies a team-preview screenshot as team mode with opponent targets', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 900, 60 + k * 95, 260, 72, 220, 30, 40);
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('team');
    expect(targets.length).toBe(6);
    expect(targets.every((t) => t.side === 'opponent' && t.hpPercent === null)).toBe(true);
  });

  it('classifies a battle screenshot as battle mode with both sides', () => {
    const img = blank(1250, 700);
    fillRect(img, 720, 30, 160, 40, 220, 40, 120);  // opponent plates
    fillRect(img, 960, 30, 160, 40, 220, 40, 120);
    fillRect(img, 40, 600, 160, 40, 80, 60, 190);   // player plates
    fillRect(img, 300, 600, 160, 40, 80, 60, 190);
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(targets.filter((t) => t.side === 'opponent').length).toBe(2);
    expect(targets.filter((t) => t.side === 'player').length).toBe(2);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/features/scan/scanTargets.test.ts` — expect FAIL.

- [ ] **Step 3: Implement**

`types.ts` — replace `SlotResult` and add `ScanSide`:

```ts
export type ScanSide = 'player' | 'opponent';
export interface SlotResult { box: TileBox; candidates: Candidate[]; side?: ScanSide; hpPercent?: number | null }
```

```ts
// src/features/scan/scanTargets.ts
// Decides what a screenshot is (team preview vs in-battle) and where the
// classifiable sprites are. App team scans stay opponent-only by design —
// the labeler covers both sides separately for training data.
import { detectOpponentSpriteBoxes } from './segmentation';
import { detectBattlePanels, battleIconFromPanel, type BattleSide } from './battleDetection';
import { readHpFromPanel } from './hpText';
import type { RgbaImage, ScanSide, TileBox } from './types';

export type ScanMode = 'team' | 'battle';
export interface ScanTarget { box: TileBox; side: ScanSide; hpPercent: number | null }

function battleTargets(img: RgbaImage, side: BattleSide): ScanTarget[] {
  return detectBattlePanels(img, side).map((panel) => ({
    box: battleIconFromPanel(panel, img),
    side,
    hpPercent: readHpFromPanel(img, panel)?.percent ?? null,
  }));
}

export function detectScanTargets(img: RgbaImage): { mode: ScanMode; targets: ScanTarget[] } {
  // Battle requires BOTH opponent plates (Champions is doubles): the top card of
  // a team-preview opponent column is also magenta and sits in the same region,
  // so a single panel-like blob must not flip a team screenshot into battle mode.
  const opponent = battleTargets(img, 'opponent');
  if (opponent.length === 2) {
    return { mode: 'battle', targets: [...opponent, ...battleTargets(img, 'player')] };
  }
  return {
    mode: 'team',
    targets: detectOpponentSpriteBoxes(img).map((box) => ({ box, side: 'opponent' as const, hpPercent: null })),
  };
}
```

`scanImage.ts` — full new content:

```ts
// src/features/scan/scanImage.ts
import { cropImage } from './segmentation';
import { detectScanTargets } from './scanTargets';
import { computeDescriptor } from './fingerprint';
import { matchTile } from './match';
import type { RgbaImage, ReferenceEntry, SlotResult } from './types';

export function scanTeamImage(img: RgbaImage, refs: ReferenceEntry[], topN = 3): SlotResult[] {
  return detectScanTargets(img).targets.map(({ box, side, hpPercent }) => ({
    box,
    side,
    hpPercent,
    candidates: matchTile(computeDescriptor(cropImage(img, box)), refs, topN),
  }));
}
```

- [ ] **Step 4: Run** `npx vitest run src/features/scan` — `scanImage.test.ts` may fail if it asserts exact whole-tile boxes; update those expectations to the square sprite boxes (`spriteBoxFromTile` of the synthetic tiles). Everything else must pass unchanged.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(scan): unified scan-target detection (team/battle, both sides, hp)"`

---

### Task 6b: Game-rect inference fallback (margins, video frames, photos)

**Files:**
- Create: `src/features/scan/gameRect.ts`
- Modify: `src/features/scan/scanTargets.ts`, `src/features/scan/battleDetection.ts` (export the plate pixel predicate)
- Test: `src/features/scan/gameRect.test.ts`

**Interfaces:**
- Consumes: `connectedComponents` (segmentation), `isOpponentPlatePixel` (battleDetection, newly exported).
- Produces:
  - `export function inferGameRect(img: RgbaImage): TileBox | null` — locates the game frame inside a larger image by finding either the opponent card stack (≥4 aligned same-width magenta cards) or the battle plate pair (2 similar magenta plates side by side), then solving the 16:9 game rect from measured anchor fractions.
  - `detectScanTargets(img, allowInfer = true)` — when the fast path finds nothing, retries once inside the inferred rect and offsets returned boxes back to source coordinates.

- [ ] **Step 1: Measure anchor fractions from clean screenshots** — run `detectOpponentTiles` / `detectBattlePanels` on one clean team shot and one clean battle shot via a tsx one-liner; record the anchor bounding box as fractions of image width/height. Fills `OPP_COLUMN` / `PLATE_PAIR` constants.

- [ ] **Step 2: Write the failing test** (`gameRect.test.ts`) — synthetic margins: paint a 1200×675 "game" at offset (200, 150) inside a 1600×1200 dark image, with 6 magenta cards laid out at the measured OPP_COLUMN fractions; assert `inferGameRect` recovers the game rect within 8% per edge, and `detectScanTargets` on the full image returns 6 opponent targets in source coordinates.

- [ ] **Step 3: Implement `gameRect.ts`** — `magentaBlobs` (full-image mask with `isOpponentPlatePixel`, CC minArea 60), `findCardStack` (≥4 blobs, left-aligned within 20% of width, similar width ±25%, similar height 0.5–2×; largest group wins), `findPlatePair` (2 blobs, aspect 2–9, similar size, same row, gap < 3× width), `solveRect(anchor, frac, img)` (scale anchor box by measured fractions; reject unless 1.4 < w/h < 2.2 and rect > 20% of image). `inferGameRect` tries card stack first, then plate pair. Export `isOpponentPlatePixel` from `battleDetection.ts`. In `scanTargets.ts`: when fast path yields 0 targets and `allowInfer`, crop to `inferGameRect` and recurse once with `allowInfer = false`, offsetting returned boxes by the rect origin.

- [ ] **Step 4: Run** `npx vitest run src/features/scan/gameRect.test.ts src/features/scan/scanTargets.test.ts` — expect PASS.

- [ ] **Step 5: Real-image check** — run detection on a video-frame screenshot with browser chrome (the user's YouTube example) and confirm the card stack is found and targets land on the cards. Tune `findCardStack` tolerances if needed.

- [ ] **Step 6: Commit** — `git commit -am "feat(scan): infer game rect for margins, video frames, photos"`

---

### Task 7: `useTeamScan` routes through scan targets

**Files:**
- Modify: `src/features/scan/useTeamScan.ts`
- Test: update `src/features/scan/useTeamScan.test.ts`

**Interfaces:**
- Consumes: `detectScanTargets` (Task 6).
- Produces: `TeamScanDeps.detectOpponentTiles` is REPLACED by
  `detectScanTargets?: (img: RgbaImage) => { mode: ScanMode; targets: ScanTarget[] }`.
  Slots returned by the hook now carry `side` and `hpPercent`. Everything else (engine selection, classifier-with-descriptor-fallback, legacy 3-dep shape) unchanged.

- [ ] **Step 1: Update the hook.** In `useTeamScan.ts`:
  - Replace the `detectOpponentTiles` import/dep with `detectScanTargets` from `./scanTargets` (remove the now-unused `detectOpponentTiles` import; keep `cropImage`).
  - `TeamScanDeps`: replace `detectOpponentTiles?: (img: RgbaImage) => TileBox[];` with `detectScanTargets?: (img: RgbaImage) => { mode: ScanMode; targets: ScanTarget[] };` (import both types from `./scanTargets`).
  - `DEFAULT_DEPS`: replace `detectOpponentTiles,` with `detectScanTargets,`.
  - `hasTilePipelineDeps`: replace `deps.detectOpponentTiles != null` with `deps.detectScanTargets != null`.
  - Replace the detection block (old lines 69–86) with:

```ts
      const detectTargets = deps.detectScanTargets ?? DEFAULT_DEPS.detectScanTargets;
      const crop = deps.cropImage ?? DEFAULT_DEPS.cropImage;
      const matchTileFn = deps.matchTile ?? DEFAULT_DEPS.matchTile;
      const loadClassifierFn = deps.loadClassifier ?? DEFAULT_DEPS.loadClassifier;

      const classifier = await loadClassifierFn();
      const { targets } = detectTargets(image);
      const results: SlotResult[] = [];
      for (const { box, side, hpPercent } of targets) {
        const tile = crop(image, box);
        const classifierCandidates = classifier ? await classifier.classify(tile, legalIds, 3) : [];
        const useDescriptorFallback =
          engine === 'auto' && (!classifier || (classifierCandidates[0]?.score ?? 0) < CLASSIFIER_CONFIDENCE_THRESHOLD);
        const candidates = useDescriptorFallback
          ? matchTileFn(tile, refs, 3)
          : classifierCandidates;
        results.push({ box, side, hpPercent, candidates });
      }
```

- [ ] **Step 2: Update `useTeamScan.test.ts`.** Any injected `detectOpponentTiles: (img) => [box, ...]` fake becomes `detectScanTargets: (img) => ({ mode: 'team', targets: [{ box, side: 'opponent', hpPercent: null }, ...] })`. Assertions on slot shape gain nothing mandatory (side/hpPercent are pass-through); add one assertion that `hpPercent` flows through:

```ts
it('passes side and hpPercent from targets into slots', async () => {
  // inject detectScanTargets returning one battle target with hpPercent: 62
  // assert slots[0].side === 'opponent' && slots[0].hpPercent === 62
});
```

- [ ] **Step 3: Run** `npx vitest run src/features/scan/useTeamScan.test.ts` — expect PASS.

- [ ] **Step 4: Run** `npx tsc --noEmit` — expect no errors (catches ScanTeamModal/type fallout early; the modal compiles because the new SlotResult fields are optional).

- [ ] **Step 5: Commit** — `git commit -am "feat(scan): useTeamScan scans battle screenshots with side + hp"`

---

### Task 8: ScanTeamModal battle UI + Damage Calc wiring

**Files:**
- Modify: `src/features/scan/ScanTeamModal.tsx`, `src/pages/DamageCalculator/index.tsx`
- Test: manual verification via preview (below); no new unit tests (thin UI glue).

**Interfaces:**
- Consumes: slots with `side`/`hpPercent` (Task 7); existing `SET_HP_PERCENT` calculator action; existing `actions.handleSelectPokemon(side, p)`.
- Produces (prop signature changes):
  - `onLoadPokemon?: (pokemonId: number, opts?: { hpPercent?: number | null }) => void` (defender — opponent/unknown-side entries)
  - NEW `onLoadAttacker?: (pokemonId: number, opts?: { hpPercent?: number | null }) => void` (player entries)

- [ ] **Step 1: ScanTeamModal changes**
  - `RosterEntry` gains `side?: ScanSide; hpPercent?: number | null` (import `ScanSide` from `./types`).
  - Roster seeding effect: `setRoster(slots.map((s) => ({ id: s.candidates[0]?.id ?? null, candidates: s.candidates, side: s.side, hpPercent: s.hpPercent })))`.
  - Props: update `onLoadPokemon` signature and add `onLoadAttacker` as above.
  - In the entry row, after the index `<span>`, add a side/HP badge:

```tsx
{(entry.side || entry.hpPercent != null) && (
  <div className="flex flex-col items-center gap-0.5 pt-2">
    {entry.side && (
      <span className={`text-[10px] px-1 rounded font-semibold ${entry.side === 'player' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
        {entry.side === 'player' ? 'You' : 'Opp'}
      </span>
    )}
    {entry.hpPercent != null && <span className="text-[10px] text-gray-500">{entry.hpPercent}% HP</span>}
  </div>
)}
```

  - Replace the "Set as defender" button block with side-aware buttons:

```tsx
{onLoadPokemon && entry.side !== 'player' && (
  <button
    type="button"
    className="px-2 py-1 text-xs font-semibold text-blue-600 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
    onClick={() => entry.id != null && onLoadPokemon(entry.id, { hpPercent: entry.hpPercent })}
    disabled={entry.id == null}
  >
    Set as defender
  </button>
)}
{onLoadAttacker && entry.side === 'player' && (
  <button
    type="button"
    className="px-2 py-1 text-xs font-semibold text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
    onClick={() => entry.id != null && onLoadAttacker(entry.id, { hpPercent: entry.hpPercent })}
    disabled={entry.id == null}
  >
    Set as attacker
  </button>
)}
```

- [ ] **Step 2: DamageCalculator changes** (`src/pages/DamageCalculator/index.tsx`)

```tsx
  const handleLoadDefender = (pokemonId: number, opts?: { hpPercent?: number | null }) => {
    const p = pokemonList.find((p) => p.id === pokemonId);
    if (!p) return;
    actions.handleSelectPokemon('p2', p);
    if (opts?.hpPercent != null) dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: opts.hpPercent } });
  };

  const handleLoadAttacker = (pokemonId: number, opts?: { hpPercent?: number | null }) => {
    const p = pokemonList.find((p) => p.id === pokemonId);
    if (!p) return;
    actions.handleSelectPokemon('p1', p);
    if (opts?.hpPercent != null) dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p1', val: opts.hpPercent } });
  };
```

and pass `onLoadAttacker={handleLoadAttacker}` to `<ScanTeamModal ...>`.

- [ ] **Step 3: Type check + tests** — `npx tsc --noEmit && npx vitest run src/features/scan` — expect PASS. (Teams page compiles unchanged: it doesn't pass `onLoadPokemon`.)

- [ ] **Step 4: Verify in the app** — start the dev server (preview), open Damage Calculator → "Scan opponent", pick the reference in-battle screenshot, confirm: 4 entries (2 Opp / 2 You badges), HP% shown, "Set as defender" fills p2 + HP, "Set as attacker" fills p1. Then scan the team-preview screenshot: 6 opponent entries, no badges/HP, existing flow intact.

- [ ] **Step 5: Commit** — `git commit -am "feat(calc): battle scan sets attacker/defender with scanned HP"`

---

### Task 9: Labeler crops both sides in both modes

**Files:**
- Modify: `scripts/label-sprites-core.ts`
- Test: update `scripts/label-sprites-core.test.ts`

**Interfaces:**
- Consumes: `detectOpponentSpriteBoxes`, `detectPlayerSpriteBoxes` (Task 2), `detectBattleIcons(img, side)` (Task 3).
- Produces: `detectTiles`, `detectBattleIcons` (script-local), `detectLabelCrops` — same signatures, both sides included. Auto-mode rule: battle iff **opponent** icons found (=2), else team if any tiles.

- [ ] **Step 1: Update tests** in `label-sprites-core.test.ts`: where a synthetic team screenshot with only red tiles expects N boxes, that stays; add a case with red tiles right + purple tiles left expecting `boxes.length` = opponent + player counts; battle case with both plate colors expects 4 icons and `mode: 'battle'`.

- [ ] **Step 2: Run** the test file — expect FAIL on new cases.

- [ ] **Step 3: Implement** in `label-sprites-core.ts`:

```ts
import { detectOpponentSpriteBoxes, detectPlayerSpriteBoxes } from '../src/features/scan/segmentation';
import { detectBattleIcons as detectSideBattleIcons } from '../src/features/scan/battleDetection';

export function detectTiles(img: RgbaImage): TileBox[] {
  return [...detectOpponentSpriteBoxes(img), ...detectPlayerSpriteBoxes(img)];
}

export function detectBattleIcons(img: RgbaImage): TileBox[] {
  return [...detectSideBattleIcons(img, 'opponent'), ...detectSideBattleIcons(img, 'player')];
}

export function detectLabelCrops(img: RgbaImage, requestedMode: RequestedMode = 'auto'): { mode: LabelMode; boxes: TileBox[] } {
  if (requestedMode === 'team') return { mode: 'team', boxes: detectTiles(img) };
  if (requestedMode === 'battle') return { mode: 'battle', boxes: detectBattleIcons(img) };

  if (detectSideBattleIcons(img, 'opponent').length === 2) {
    return { mode: 'battle', boxes: detectBattleIcons(img) };
  }
  const teamBoxes = detectTiles(img);
  if (teamBoxes.length > 0) return { mode: 'team', boxes: teamBoxes };
  return { mode: 'battle', boxes: detectBattleIcons(img) };
}
```

(The old `detectTiles` returned whole tiles; sprite boxes now flow to the labeler and its saved crops automatically. `label-sprites.ts` itself needs no changes.)

- [ ] **Step 4: Run** `npx vitest run scripts` — expect PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(scan): labeler crops square sprites on both sides"`

---

### Task 10: Regenerate training data (user-interactive)

**Files:**
- Create: `scripts/check-menu-sprite-aspects.ts`
- Delete: `public/images/pokemon/menu-sprites/*_Xnip*.png` (396 files), `training/.processed.json`, `training/.processed.battle.json`
- Regenerated: `public/images/pokemon/reference-descriptors.json`, new `*_Xnip*` crops

**Interfaces:**
- Consumes: the Task 9 labeler.
- Produces: a fully square-cropped, both-sides training set in `menu-sprites/` for Task 11.

- [ ] **Step 1: Write the validation script**

```ts
// scripts/check-menu-sprite-aspects.ts
// Data guard: every training crop must be square-ish (sprite crops), never a
// whole-card crop. Run after (re)labeling.
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

const dir = path.resolve('public/images/pokemon/menu-sprites');
let bad = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.png'))) {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const ar = png.width / png.height;
  if (ar > 1.5 || ar < 0.67) {
    console.log(`WIDE: ${f}  ${png.width}x${png.height}`);
    bad++;
  }
}
console.log(bad === 0 ? 'OK: all crops square-ish' : `${bad} bad crop(s)`);
process.exit(bad === 0 ? 0 : 1);
```

- [ ] **Step 2: Delete derived data and labeling state**

```bash
rm public/images/pokemon/menu-sprites/*_Xnip*.png
rm -f training/.processed.json training/.processed.battle.json
ls public/images/pokemon/menu-sprites | wc -l   # expect 213
```

- [ ] **Step 3: Rebuild descriptors from clean sprites only** (so labeling suggestions work): `npx tsx scripts/generate-sprite-descriptors.ts`

- [ ] **Step 4: Relabel (USER, interactive)** — `npx tsx scripts/label-sprites.ts` over all 76 screenshots. Both sides are cropped now, so expect roughly 6–12 crops per team screenshot and up to 4 per battle screenshot. Shiny variants: answer with `<id> shiny` as before. **Also add 2–3 phone photos of the screen and a couple of video-frame screenshots (YouTube etc.) to `training/screenshots/` first** — jpg/heic are accepted — so the training set covers those capture domains.

- [ ] **Step 5: Rebuild descriptors with the new crops**: `npx tsx scripts/generate-sprite-descriptors.ts`

- [ ] **Step 6: Validate**: `npx tsx scripts/check-menu-sprite-aspects.ts` → `OK`; `npx vitest run src/features/scan/referenceData.test.ts` → PASS.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "data(scan): regenerate training crops as square both-side sprites"`

---

### Task 11: Retrain + ship the model (user, Colab)

**Files:**
- Replace: `public/models/pokemon-sprite-net/model.onnx`, `public/models/pokemon-sprite-net/classes.json`

**Interfaces:**
- Consumes: regenerated `menu-sprites/` (Task 10); existing `scripts/train_sprite_net.py` (unchanged).
- Produces: the classifier the app loads via `loadClassifier()`.

- [ ] **Step 0: Add perspective augmentation** — in `scripts/train_sprite_net.py`, insert `T.RandomPerspective(distortion_scale=0.15, p=0.3),` immediately after the `T.RandomAffine(...)` line (simulates phone-camera angle); commit.
- [ ] **Step 1 (USER):** `cd public/images/pokemon && zip -r menu-sprites.zip menu-sprites` → upload+unzip in Colab with `scripts/train_sprite_net.py` → `pip install torch torchvision onnx` → `python train_sprite_net.py --data menu-sprites --epochs 40 --out out`.
- [ ] **Step 2 (USER):** Evaluate with `scripts/test_sprite_net.py` per its header; expect held-out accuracy comparable or better than the previous run (record the number).
- [ ] **Step 3 (USER):** Download `out/model.onnx` + `out/classes.json` into `public/models/pokemon-sprite-net/`.
- [ ] **Step 4: In-app verification** — dev server: scan the reference team-preview screenshot (6/6 correct species expected in top-3) and the battle screenshot (4/4 species + correct HP%). Check the console shows `[scan] engine: classifier`.
- [ ] **Step 5: Commit** — `git add public/models/pokemon-sprite-net && git commit -m "feat(scan): retrained sprite net on square both-side crops"`

---

### Deferred (not in this plan)

- Slimming `public/` by moving `*_Xnip*` crops to `training/` once the classifier is validated in daily use and the descriptor matcher is retired (spec §7).
- Random-background compositing augmentation — only if evaluation shows background sensitivity (spec: decisions).
