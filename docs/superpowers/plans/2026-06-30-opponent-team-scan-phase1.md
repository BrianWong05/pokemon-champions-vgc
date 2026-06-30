# Opponent Team Scan — Phase 1 (Descriptor Matcher) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user pick a Pokémon Champions team-select screenshot and auto-build a saved team from the opponent's 6 Pokémon, recognized fully on-device with a pure-JS descriptor matcher.

**Architecture:** A pure, environment-agnostic CV core (`RgbaImage` in → `SlotResult[]` out) made of small pure functions — red-tile segmentation, a 4-channel sprite fingerprint, and a format-scoped nearest-neighbor matcher. A build script precomputes reference-sprite descriptors into a static JSON asset. A confirm/correct modal lets the user fix matches, then reuses the existing `handleImportTeam` path to create the team.

**Tech Stack:** TypeScript, React 19, Vite, Vitest (node env, colocated `*.test.ts`), Canvas/`ImageData`, `pngjs` (build script), `@capacitor/camera` (capture).

## Global Constraints

- **Imports:** absolute `@/` for cross-feature; `./x` only for same-folder. Never `../` (ESLint-enforced).
- **Recognition is fully on-device / offline** — no network at scan time, no ML runtime in Phase 1.
- **CV core is pure & node-testable:** every algorithm operates on `RgbaImage = { data: Uint8ClampedArray; width: number; height: number }` (the `ImageData` shape), never on a live `<canvas>`. Browser-only adapters (image loading, worker, camera, modal) are thin and verified manually.
- **`fingerprint.ts` is shared verbatim** by the runtime matcher and the build script, so reference and query descriptors are bit-identical.
- **Reference sprites:** Champions `Menu_CP` menu sprites, renamed to `{pokemon.id}.png`, under `public/images/pokemon/menu-sprites/`. `pokemon.id` = national-dex id (base `1–1025`, forms `≥10000`).
- **Format scoping:** candidate set = `getPokemonListByFormat(activeFormat)` ids from `FormatContext`.
- **Persistence/integration:** scan emits `ParsedShowdownSet[]` and reuses the Teams page `handleImportTeam` (resolve → `createTeam` → navigate) untouched. Never call `teamRepository` from UI.
- **Tests run from repo root** via `npm test`; fresh worktrees need `npm install --legacy-peer-deps` first.

---

## File Structure

```
src/features/scan/
  types.ts                 # RgbaImage, TileBox, Descriptor, ReferenceEntry, Candidate, SlotResult
  fingerprint.ts           # grayResize, dHash, hamming, rgb16vec, silhouette8, edge8, cosine, computeDescriptor
  fingerprint.test.ts
  match.ts                 # scoreDescriptors, matchTile (+ shiny re-rank)
  match.test.ts
  segmentation.ts          # rgbToHsv, isRedPixel, redMask, connectedComponents, detectOpponentTiles, cropImage
  segmentation.test.ts
  scanImage.ts             # scanTeamImage (orchestration)
  scanImage.test.ts
  referenceData.ts         # loadReferenceDescriptors, filterByFormatLegal
  referenceData.test.ts
  toParsedSets.ts          # selected pokemon -> ParsedShowdownSet[]
  toParsedSets.test.ts
  imageLoading.ts          # blobToRgbaImage (browser)
  capture.ts               # pickImage via @capacitor/camera + <input> fallback (browser)
  scan.worker.ts           # worker wrapper around scanTeamImage
  useTeamScan.ts           # hook: input -> worker -> SlotResult[]
  ScanTeamModal.tsx        # confirm/correct UI; onImport(ParsedShowdownSet[])
  __fixtures__/            # real labeled Champions screenshots for the golden test

scripts/generate-sprite-descriptors.ts   # menu-sprites/*.png -> reference-descriptors.json
public/images/pokemon/menu-sprites/{id}.png            # reference sprites (manual asset step)
public/images/pokemon/reference-descriptors.json        # generated output
src/pages/Teams/index.tsx                 # add "Scan Team" button + modal wiring
```

---

### Task 1: Types + fingerprint hashing core

**Files:**
- Create: `src/features/scan/types.ts`
- Create: `src/features/scan/fingerprint.ts`
- Test: `src/features/scan/fingerprint.test.ts`

**Interfaces:**
- Produces: `RgbaImage`, `TileBox`, `Descriptor`, `ReferenceEntry`, `Candidate`, `SlotResult` (types); `grayResize(img, w, h): Float64Array`, `dHash(img): string`, `hamming(a: string, b: string): number`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/scan/fingerprint.test.ts
import { describe, it, expect } from 'vitest';
import { grayResize, dHash, hamming } from './fingerprint';
import type { RgbaImage } from './types';

// Solid-color 2x2 image helper
function solid(r: number, g: number, b: number, a = 255, w = 2, h = 2): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i*4]=r; data[i*4+1]=g; data[i*4+2]=b; data[i*4+3]=a; }
  return { data, width: w, height: h };
}
// Left-half black, right-half white (horizontal gradient)
function leftDark(w = 9, h = 8): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = x < w / 2 ? 0 : 255, i = (y*w+x)*4;
    data[i]=v; data[i+1]=v; data[i+2]=v; data[i+3]=255;
  }
  return { data, width: w, height: h };
}

describe('grayResize', () => {
  it('returns w*h luminance samples', () => {
    const g = grayResize(solid(255, 0, 0), 4, 4);
    expect(g.length).toBe(16);
    expect(Math.round(g[0])).toBe(76); // 0.299*255
  });
});

describe('dHash / hamming', () => {
  it('produces a 16-hex-char hash', () => {
    expect(dHash(leftDark())).toMatch(/^[0-9a-f]{16}$/);
  });
  it('hamming of identical hashes is 0 and is symmetric', () => {
    const h = dHash(leftDark());
    expect(hamming(h, h)).toBe(0);
    expect(hamming('0000000000000000', 'ffffffffffffffff')).toBe(64);
    expect(hamming('00ff00ff00ff00ff', 'ffffffffffffffff')).toBe(hamming('ffffffffffffffff', '00ff00ff00ff00ff'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/fingerprint.test.ts`
Expected: FAIL — cannot find module `./fingerprint`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/scan/types.ts
export interface RgbaImage { data: Uint8ClampedArray; width: number; height: number }
export interface TileBox { x: number; y: number; w: number; h: number }
export interface Descriptor { dhash: string; rgb16: number[]; sil8: number[]; edge8: number[] }
export interface ReferenceEntry { id: number; desc: Descriptor }
export interface Candidate { id: number; score: number }
export interface SlotResult { box: TileBox; candidates: Candidate[] }
```

```ts
// src/features/scan/fingerprint.ts
import type { RgbaImage } from './types';

export function grayResize(img: RgbaImage, w: number, h: number): Float64Array {
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y + 0.5) * img.height / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x + 0.5) * img.width / w));
      const i = (sy * img.width + sx) * 4;
      out[y * w + x] = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    }
  }
  return out;
}

export function dHash(img: RgbaImage): string {
  const g = grayResize(img, 9, 8); // 9 wide, 8 tall -> 64 horizontal comparisons
  let bits = 0n, bit = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (g[y * 9 + x] < g[y * 9 + x + 1]) bits |= (1n << bit);
      bit++;
    }
  }
  return bits.toString(16).padStart(16, '0');
}

export function hamming(a: string, b: string): number {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b), count = 0;
  while (x > 0n) { count += Number(x & 1n); x >>= 1n; }
  return count;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/fingerprint.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/types.ts src/features/scan/fingerprint.ts src/features/scan/fingerprint.test.ts
git commit -m "feat(scan): add scan types + dHash fingerprint core"
```

---

### Task 2: Color / silhouette / edge channels + descriptor

**Files:**
- Modify: `src/features/scan/fingerprint.ts`
- Test: `src/features/scan/fingerprint.test.ts`

**Interfaces:**
- Consumes: `grayResize` (Task 1).
- Produces: `rgb16vec(img): number[]` (768), `silhouette8(img): number[]` (64), `edge8(img): number[]` (64), `cosine(a, b): number`, `computeDescriptor(img): Descriptor`.

- [ ] **Step 1: Write the failing test** (append to `fingerprint.test.ts`)

```ts
import { rgb16vec, silhouette8, edge8, cosine, computeDescriptor } from './fingerprint';

describe('rgb16vec', () => {
  it('returns 768 channel values', () => {
    expect(rgb16vec(solid(10, 20, 30)).length).toBe(16 * 16 * 3);
    expect(rgb16vec(solid(10, 20, 30)).slice(0, 3)).toEqual([10, 20, 30]);
  });
});

describe('silhouette8', () => {
  it('marks opaque pixels 1 and transparent 0', () => {
    expect(silhouette8(solid(0, 0, 0, 255))).toEqual(new Array(64).fill(1));
    expect(silhouette8(solid(0, 0, 0, 0))).toEqual(new Array(64).fill(0));
  });
});

describe('edge8 / cosine', () => {
  it('edge8 returns 64 magnitudes, ~0 for a flat image', () => {
    const e = edge8(solid(120, 120, 120));
    expect(e.length).toBe(64);
    expect(Math.max(...e)).toBe(0);
  });
  it('cosine of identical vectors is 1, orthogonal is 0', () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });
});

describe('computeDescriptor', () => {
  it('assembles all four channels at correct lengths', () => {
    const d = computeDescriptor(solid(200, 50, 50));
    expect(d.dhash).toMatch(/^[0-9a-f]{16}$/);
    expect(d.rgb16.length).toBe(768);
    expect(d.sil8.length).toBe(64);
    expect(d.edge8.length).toBe(64);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/fingerprint.test.ts`
Expected: FAIL — `rgb16vec` is not exported.

- [ ] **Step 3: Write minimal implementation** (append to `fingerprint.ts`)

```ts
function sampleGrid(img: RgbaImage, n: number, fn: (i: number) => void): void {
  for (let y = 0; y < n; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y + 0.5) * img.height / n));
    for (let x = 0; x < n; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x + 0.5) * img.width / n));
      fn((sy * img.width + sx) * 4);
    }
  }
}

export function rgb16vec(img: RgbaImage): number[] {
  const out: number[] = [];
  sampleGrid(img, 16, (i) => out.push(img.data[i], img.data[i + 1], img.data[i + 2]));
  return out;
}

export function silhouette8(img: RgbaImage): number[] {
  const out: number[] = [];
  sampleGrid(img, 8, (i) => out.push(img.data[i + 3] > 127 ? 1 : 0));
  return out;
}

export function edge8(img: RgbaImage): number[] {
  const g = grayResize(img, 10, 10);
  const at = (x: number, y: number) => g[y * 10 + x];
  const out: number[] = [];
  for (let y = 1; y <= 8; y++) {
    for (let x = 1; x <= 8; x++) {
      const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) -
                 (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) -
                 (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      out.push(Math.min(255, Math.round(Math.sqrt(gx * gx + gy * gy) / 4)));
    }
  }
  return out;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function computeDescriptor(img: RgbaImage): Descriptor {
  return { dhash: dHash(img), rgb16: rgb16vec(img), sil8: silhouette8(img), edge8: edge8(img) };
}
```

Add `import type { Descriptor, RgbaImage } from './types';` at the top (merge with existing import).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/fingerprint.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/fingerprint.ts src/features/scan/fingerprint.test.ts
git commit -m "feat(scan): add rgb/silhouette/edge channels and computeDescriptor"
```

---

### Task 3: Matcher with shiny re-rank

**Files:**
- Create: `src/features/scan/match.ts`
- Test: `src/features/scan/match.test.ts`

**Interfaces:**
- Consumes: `Descriptor`, `ReferenceEntry`, `Candidate` (types); `hamming`, `cosine` (fingerprint).
- Produces: `scoreDescriptors(a, b, weights?): number`, `matchTile(desc, refs, topN?): Candidate[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/scan/match.test.ts
import { describe, it, expect } from 'vitest';
import { scoreDescriptors, matchTile } from './match';
import type { Descriptor, ReferenceEntry } from './types';

function desc(seed: number): Descriptor {
  return {
    dhash: seed.toString(16).padStart(16, '0'),
    rgb16: new Array(768).fill(seed % 256),
    sil8: new Array(64).fill(seed % 2),
    edge8: new Array(64).fill(seed % 128),
  };
}

describe('scoreDescriptors', () => {
  it('scores an identical descriptor at 1.0', () => {
    const d = desc(42);
    expect(scoreDescriptors(d, d)).toBeCloseTo(1, 6);
  });
});

describe('matchTile', () => {
  it('returns the exact-match id first', () => {
    const refs: ReferenceEntry[] = [
      { id: 1, desc: desc(1) }, { id: 25, desc: desc(25) }, { id: 6, desc: desc(6) },
    ];
    const out = matchTile(desc(25), refs, 3);
    expect(out[0].id).toBe(25);
    expect(out.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/match.test.ts`
Expected: FAIL — cannot find module `./match`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/scan/match.ts
import { hamming, cosine } from './fingerprint';
import type { Candidate, Descriptor, ReferenceEntry } from './types';

export interface ScoreWeights { dhash: number; rgb: number; sil: number; edge: number }
const DEFAULT_WEIGHTS: ScoreWeights = { dhash: 0.4, rgb: 0.3, sil: 0.15, edge: 0.15 };

export function scoreDescriptors(a: Descriptor, b: Descriptor, w: ScoreWeights = DEFAULT_WEIGHTS): number {
  const dh = 1 - hamming(a.dhash, b.dhash) / 64;
  return w.dhash * dh + w.rgb * cosine(a.rgb16, b.rgb16) + w.sil * cosine(a.sil8, b.sil8) + w.edge * cosine(a.edge8, b.edge8);
}

// Hue-invariant score (drops the color channel) for shiny / palette-swap tie-breaks.
function invariantScore(a: Descriptor, b: Descriptor): number {
  return 0.6 * (1 - hamming(a.dhash, b.dhash) / 64) + 0.2 * cosine(a.sil8, b.sil8) + 0.2 * cosine(a.edge8, b.edge8);
}

export function matchTile(desc: Descriptor, refs: ReferenceEntry[], topN = 3): Candidate[] {
  const scored = refs.map((r) => ({ id: r.id, score: scoreDescriptors(desc, r.desc), desc: r.desc }));
  scored.sort((a, b) => b.score - a.score);
  // Thin margin => re-rank the head on hue-invariant channels (shiny robustness).
  if (scored.length >= 2 && scored[0].score - scored[1].score < 0.05) {
    const head = scored.slice(0, Math.min(8, scored.length))
      .map((c) => ({ id: c.id, score: invariantScore(desc, c.desc) }))
      .sort((a, b) => b.score - a.score);
    return head.slice(0, topN).map(({ id, score }) => ({ id, score }));
  }
  return scored.slice(0, topN).map(({ id, score }) => ({ id, score }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/match.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/match.ts src/features/scan/match.test.ts
git commit -m "feat(scan): add format-scoped matcher with shiny re-rank"
```

---

### Task 4: Red-tile segmentation + crop

**Files:**
- Create: `src/features/scan/segmentation.ts`
- Test: `src/features/scan/segmentation.test.ts`

**Interfaces:**
- Consumes: `RgbaImage`, `TileBox` (types).
- Produces: `rgbToHsv(r,g,b): [number,number,number]`, `isRedPixel(r,g,b,opts?): boolean`, `redMask(img,opts?): Uint8Array`, `connectedComponents(mask,width,height,minArea?): TileBox[]`, `detectOpponentTiles(img,opts?): TileBox[]`, `cropImage(img,box): RgbaImage`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/scan/segmentation.test.ts
import { describe, it, expect } from 'vitest';
import { isRedPixel, connectedComponents, detectOpponentTiles, cropImage } from './segmentation';
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

describe('isRedPixel', () => {
  it('accepts saturated red, rejects blue and gray', () => {
    expect(isRedPixel(220, 30, 40)).toBe(true);
    expect(isRedPixel(30, 40, 220)).toBe(false);
    expect(isRedPixel(120, 120, 120)).toBe(false);
  });
});

describe('connectedComponents', () => {
  it('finds two separate blobs', () => {
    const w = 20, h = 10, mask = new Uint8Array(w * h);
    mask[0] = 1; mask[1] = 1; mask[w] = 1;        // blob A near origin
    mask[15] = 1; mask[16] = 1;                    // blob B
    const boxes = connectedComponents(mask, w, h, 1);
    expect(boxes.length).toBe(2);
  });
});

describe('detectOpponentTiles', () => {
  it('detects 6 red tiles stacked on the right side', () => {
    const img = blank(400, 600);
    for (let k = 0; k < 6; k++) fillRect(img, 300, 20 + k * 95, 80, 70, 220, 30, 40);
    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    // returned top-to-bottom
    for (let k = 1; k < boxes.length; k++) expect(boxes[k].y).toBeGreaterThan(boxes[k - 1].y);
  });
});

describe('cropImage', () => {
  it('extracts the requested sub-rectangle', () => {
    const img = blank(10, 10);
    fillRect(img, 2, 3, 4, 4, 1, 2, 3);
    const c = cropImage(img, { x: 2, y: 3, w: 4, h: 4 });
    expect(c.width).toBe(4); expect(c.height).toBe(4);
    expect([c.data[0], c.data[1], c.data[2]]).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/segmentation.test.ts`
Expected: FAIL — cannot find module `./segmentation`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/scan/segmentation.ts
import type { RgbaImage, TileBox } from './types';

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

export interface RedOpts { hMax: number; hMin: number; sMin: number; vMin: number }
const RED: RedOpts = { hMax: 18, hMin: 342, sMin: 0.45, vMin: 0.3 };

export function isRedPixel(r: number, g: number, b: number, opts: RedOpts = RED): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  return (h <= opts.hMax || h >= opts.hMin) && s >= opts.sMin && v >= opts.vMin;
}

export function redMask(img: RgbaImage, opts: RedOpts = RED): Uint8Array {
  const mask = new Uint8Array(img.width * img.height);
  for (let p = 0; p < mask.length; p++) {
    const i = p * 4;
    if (img.data[i + 3] > 0 && isRedPixel(img.data[i], img.data[i + 1], img.data[i + 2], opts)) mask[p] = 1;
  }
  return mask;
}

export function connectedComponents(mask: Uint8Array, width: number, height: number, minArea = 50): TileBox[] {
  const visited = new Uint8Array(mask.length);
  const boxes: TileBox[] = [];
  const queue: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let minX = width, minY = height, maxX = 0, maxY = 0, area = 0;
    queue.length = 0; queue.push(start); visited[start] = 1;
    while (queue.length) {
      const p = queue.pop()!;
      const x = p % width, y = (p / width) | 0;
      area++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && mask[p - 1] && !visited[p - 1]) { visited[p - 1] = 1; queue.push(p - 1); }
      if (x < width - 1 && mask[p + 1] && !visited[p + 1]) { visited[p + 1] = 1; queue.push(p + 1); }
      if (y > 0 && mask[p - width] && !visited[p - width]) { visited[p - width] = 1; queue.push(p - width); }
      if (y < height - 1 && mask[p + width] && !visited[p + width]) { visited[p + width] = 1; queue.push(p + width); }
    }
    if (area >= minArea) boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
  }
  return boxes;
}

export function detectOpponentTiles(img: RgbaImage, opts: RedOpts = RED): TileBox[] {
  const minArea = Math.max(50, Math.floor(img.width * img.height * 0.0005));
  let boxes = connectedComponents(redMask(img, opts), img.width, img.height, minArea)
    .filter((b) => b.w > img.width * 0.08 && b.h > img.height * 0.03 && b.w / b.h > 1.1 && b.w / b.h < 8)
    .filter((b) => b.x + b.w / 2 > img.width * 0.5); // opponent column is on the right
  boxes.sort((a, b) => a.y - b.y);
  return boxes.slice(0, 6);
}

export function cropImage(img: RgbaImage, box: TileBox): RgbaImage {
  const data = new Uint8ClampedArray(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const si = ((box.y + y) * img.width + (box.x + x)) * 4;
      const di = (y * box.w + x) * 4;
      data[di] = img.data[si]; data[di + 1] = img.data[si + 1];
      data[di + 2] = img.data[si + 2]; data[di + 3] = img.data[si + 3];
    }
  }
  return { data, width: box.w, height: box.h };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/segmentation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/segmentation.ts src/features/scan/segmentation.test.ts
git commit -m "feat(scan): add red-tile segmentation, connected components, crop"
```

---

### Task 5: Pipeline orchestration

**Files:**
- Create: `src/features/scan/scanImage.ts`
- Test: `src/features/scan/scanImage.test.ts`

**Interfaces:**
- Consumes: `detectOpponentTiles`, `cropImage` (segmentation); `computeDescriptor` (fingerprint); `matchTile` (match); types.
- Produces: `scanTeamImage(img: RgbaImage, refs: ReferenceEntry[], topN?): SlotResult[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/scan/scanImage.test.ts
import { describe, it, expect } from 'vitest';
import { scanTeamImage } from './scanImage';
import { computeDescriptor } from './fingerprint';
import { cropImage } from './segmentation';
import type { RgbaImage, ReferenceEntry } from './types';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * img.width + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
}

describe('scanTeamImage', () => {
  it('returns one slot per detected tile with ranked candidates', () => {
    const img = blank(400, 600);
    // 6 red tiles, each with a distinct colored inner square (the "sprite")
    const inner = [[0,0,255],[0,255,0],[255,255,0],[255,0,255],[0,255,255],[255,128,0]];
    for (let k = 0; k < 6; k++) {
      fillRect(img, 300, 20 + k * 95, 80, 70, 220, 30, 40);
      fillRect(img, 320, 30 + k * 95, 40, 40, inner[k][0], inner[k][1], inner[k][2]);
    }
    // Build a reference set by fingerprinting each tile's own crop -> ids 101..106
    const refs: ReferenceEntry[] = [];
    for (let k = 0; k < 6; k++) {
      const crop = cropImage(img, { x: 300, y: 20 + k * 95, w: 80, h: 70 });
      refs.push({ id: 101 + k, desc: computeDescriptor(crop) });
    }
    const slots = scanTeamImage(img, refs, 3);
    expect(slots.length).toBe(6);
    // each slot's top candidate should be its own reference id
    slots.forEach((s, k) => expect(s.candidates[0].id).toBe(101 + k));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/scanImage.test.ts`
Expected: FAIL — cannot find module `./scanImage`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/scan/scanImage.ts
import { detectOpponentTiles, cropImage } from './segmentation';
import { computeDescriptor } from './fingerprint';
import { matchTile } from './match';
import type { RgbaImage, ReferenceEntry, SlotResult } from './types';

export function scanTeamImage(img: RgbaImage, refs: ReferenceEntry[], topN = 3): SlotResult[] {
  return detectOpponentTiles(img).map((box) => ({
    box,
    candidates: matchTile(computeDescriptor(cropImage(img, box)), refs, topN),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/scanImage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/scanImage.ts src/features/scan/scanImage.test.ts
git commit -m "feat(scan): add scanTeamImage pipeline orchestration"
```

---

### Task 6: Reference-descriptor build script

**Files:**
- Create: `scripts/generate-sprite-descriptors.ts`
- Create: `scripts/__fixtures__/menu-sprites/25.png` and `.../6.png` (tiny test sprites — see Step 1)
- Test: `scripts/generate-sprite-descriptors.test.ts`
- Modify: `package.json` (add `pngjs` + `@types/pngjs` dev deps)

**Interfaces:**
- Consumes: `computeDescriptor` (fingerprint).
- Produces: `readPng(file): RgbaImage`, `generateDescriptors(srcDir): Record<string, Descriptor>` (and a CLI entry that writes `public/images/pokemon/reference-descriptors.json`).

- [ ] **Step 1: Install deps and create fixtures**

Run:
```bash
npm install --save-dev pngjs @types/pngjs --legacy-peer-deps
```
Create two tiny solid-color PNG fixtures with a one-off node snippet (run once, then delete the snippet):
```bash
node -e "const {PNG}=require('pngjs'),fs=require('fs');fs.mkdirSync('scripts/__fixtures__/menu-sprites',{recursive:true});for(const [id,c] of [['25',[255,200,0]],['6',[230,80,30]]]){const p=new PNG({width:8,height:8});for(let i=0;i<8*8;i++){p.data[i*4]=c[0];p.data[i*4+1]=c[1];p.data[i*4+2]=c[2];p.data[i*4+3]=255;}fs.writeFileSync('scripts/__fixtures__/menu-sprites/'+id+'.png',PNG.sync.write(p));}console.log('fixtures written');"
```

- [ ] **Step 2: Write the failing test**

```ts
// scripts/generate-sprite-descriptors.test.ts
import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { generateDescriptors } from './generate-sprite-descriptors';

describe('generateDescriptors', () => {
  it('produces a 4-channel descriptor per numeric-id PNG', () => {
    const out = generateDescriptors(path.resolve('scripts/__fixtures__/menu-sprites'));
    expect(Object.keys(out).sort()).toEqual(['25', '6']);
    expect(out['25'].dhash).toMatch(/^[0-9a-f]{16}$/);
    expect(out['25'].rgb16.length).toBe(768);
    expect(out['25'].sil8.length).toBe(64);
    expect(out['25'].edge8.length).toBe(64);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run scripts/generate-sprite-descriptors.test.ts`
Expected: FAIL — cannot find module `./generate-sprite-descriptors`.

- [ ] **Step 4: Write minimal implementation**

```ts
// scripts/generate-sprite-descriptors.ts
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import { computeDescriptor } from '../src/features/scan/fingerprint';
import type { Descriptor, RgbaImage } from '../src/features/scan/types';

export function readPng(file: string): RgbaImage {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

export function generateDescriptors(srcDir: string): Record<string, Descriptor> {
  const out: Record<string, Descriptor> = {};
  for (const f of fs.readdirSync(srcDir)) {
    if (!f.endsWith('.png')) continue;
    const id = path.basename(f, '.png');
    if (!/^\d+$/.test(id)) continue;
    try { out[id] = computeDescriptor(readPng(path.join(srcDir, f))); }
    catch (e) { console.warn(`skip ${f}: ${(e as Error).message}`); }
  }
  return out;
}

// CLI: npx tsx scripts/generate-sprite-descriptors.ts
if (process.argv[1] && process.argv[1].endsWith('generate-sprite-descriptors.ts')) {
  const src = path.resolve('public/images/pokemon/menu-sprites');
  const outFile = path.resolve('public/images/pokemon/reference-descriptors.json');
  const out = generateDescriptors(src);
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log(`Wrote ${Object.keys(out).length} descriptors to ${outFile}`);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run scripts/generate-sprite-descriptors.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-sprite-descriptors.ts scripts/generate-sprite-descriptors.test.ts scripts/__fixtures__ package.json package-lock.json
git commit -m "feat(scan): add reference-descriptor build script (pngjs)"
```

---

### Task 7: Runtime reference loading + format scoping

**Files:**
- Create: `src/features/scan/referenceData.ts`
- Test: `src/features/scan/referenceData.test.ts`

**Interfaces:**
- Consumes: `Descriptor`, `ReferenceEntry` (types).
- Produces: `parseReferenceMap(map): ReferenceEntry[]`, `loadReferenceDescriptors(baseUrl?): Promise<ReferenceEntry[]>`, `filterByFormatLegal(refs, legalIds: Set<number>): ReferenceEntry[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/scan/referenceData.test.ts
import { describe, it, expect } from 'vitest';
import { parseReferenceMap, filterByFormatLegal } from './referenceData';
import type { Descriptor } from './types';

const d: Descriptor = { dhash: '0000000000000000', rgb16: [], sil8: [], edge8: [] };

describe('parseReferenceMap', () => {
  it('converts a string-keyed map to numeric-id entries', () => {
    const refs = parseReferenceMap({ '25': d, '10025': d });
    expect(refs.map((r) => r.id).sort((a, b) => a - b)).toEqual([25, 10025]);
  });
});

describe('filterByFormatLegal', () => {
  it('keeps only ids in the legal set', () => {
    const refs = parseReferenceMap({ '25': d, '6': d, '9999': d });
    const out = filterByFormatLegal(refs, new Set([25, 6]));
    expect(out.map((r) => r.id).sort((a, b) => a - b)).toEqual([6, 25]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/referenceData.test.ts`
Expected: FAIL — cannot find module `./referenceData`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/scan/referenceData.ts
import type { Descriptor, ReferenceEntry } from './types';

export function parseReferenceMap(map: Record<string, Descriptor>): ReferenceEntry[] {
  return Object.entries(map).map(([id, desc]) => ({ id: Number(id), desc }));
}

export async function loadReferenceDescriptors(baseUrl: string = import.meta.env.BASE_URL): Promise<ReferenceEntry[]> {
  const res = await fetch(`${baseUrl}images/pokemon/reference-descriptors.json`);
  if (!res.ok) throw new Error(`Failed to load reference descriptors: ${res.status}`);
  return parseReferenceMap(await res.json());
}

export function filterByFormatLegal(refs: ReferenceEntry[], legalIds: Set<number>): ReferenceEntry[] {
  return refs.filter((r) => legalIds.has(r.id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/referenceData.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/referenceData.ts src/features/scan/referenceData.test.ts
git commit -m "feat(scan): load reference descriptors + format-legal scoping"
```

---

### Task 8: Map recognized species to ParsedShowdownSet

**Files:**
- Create: `src/features/scan/toParsedSets.ts`
- Test: `src/features/scan/toParsedSets.test.ts`

**Interfaces:**
- Consumes: `ParsedShowdownSet` from `@/features/pokemon/utils/showdown-parser`.
- Produces: `toParsedSets(speciesNames: string[]): ParsedShowdownSet[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/scan/toParsedSets.test.ts
import { describe, it, expect } from 'vitest';
import { toParsedSets } from './toParsedSets';

describe('toParsedSets', () => {
  it('builds neutral species-only sets the import resolver accepts', () => {
    const sets = toParsedSets(['Charizard', 'Rotom (Heat)']);
    expect(sets).toHaveLength(2);
    expect(sets[0].species).toBe('Charizard');
    expect(sets[0].item).toBeNull();
    expect(sets[0].ability).toBeNull();
    expect(sets[0].nature).toBe('Serious');
    expect(sets[0].moves).toEqual([]);
    expect(sets[0].evs).toEqual({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    expect(sets[0].ivs).toEqual({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/toParsedSets.test.ts`
Expected: FAIL — cannot find module `./toParsedSets`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/scan/toParsedSets.ts
import type { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';

export function toParsedSets(speciesNames: string[]): ParsedShowdownSet[] {
  return speciesNames.map((species) => ({
    species,
    item: null,
    ability: null,
    nature: 'Serious',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: [],
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/toParsedSets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/toParsedSets.ts src/features/scan/toParsedSets.test.ts
git commit -m "feat(scan): map recognized species to ParsedShowdownSet"
```

---

### Task 9: Browser adapters — image loading, capture, worker

**Files:**
- Create: `src/features/scan/imageLoading.ts`
- Create: `src/features/scan/capture.ts`
- Create: `src/features/scan/scan.worker.ts`
- Modify: `package.json` (add `@capacitor/camera`)

**Interfaces:**
- Produces: `blobToRgbaImage(blob: Blob): Promise<RgbaImage>`; `pickImage(): Promise<Blob | null>`; a worker that receives `{ image: RgbaImage; refs: ReferenceEntry[]; topN: number }` and posts `SlotResult[]`.

> These are browser-only (DOM/Worker/Capacitor APIs unavailable in the Vitest node env), so they are verified manually via the preview in Task 12, not unit-tested.

- [ ] **Step 1: Install camera plugin**

Run:
```bash
npm install @capacitor/camera --legacy-peer-deps
```

- [ ] **Step 2: Write image loading**

```ts
// src/features/scan/imageLoading.ts
import type { RgbaImage } from './types';

export async function blobToRgbaImage(blob: Blob): Promise<RgbaImage> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { data, width, height };
}
```

- [ ] **Step 3: Write capture (Capacitor camera + web file-input fallback)**

```ts
// src/features/scan/capture.ts
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function pickImage(): Promise<Blob | null> {
  if (Capacitor.isNativePlatform()) {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
      quality: 90,
    });
    if (!photo.webPath) return null;
    return await (await fetch(photo.webPath)).blob();
  }
  return await new Promise<Blob | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
```

- [ ] **Step 4: Write the worker**

```ts
// src/features/scan/scan.worker.ts
import { scanTeamImage } from './scanImage';
import type { RgbaImage, ReferenceEntry } from './types';

export interface ScanRequest { image: RgbaImage; refs: ReferenceEntry[]; topN: number }

self.onmessage = (e: MessageEvent<ScanRequest>) => {
  const { image, refs, topN } = e.data;
  try {
    (self as unknown as Worker).postMessage({ ok: true, slots: scanTeamImage(image, refs, topN) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: (err as Error).message });
  }
};
```

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/scan/imageLoading.ts src/features/scan/capture.ts src/features/scan/scan.worker.ts package.json package-lock.json
git commit -m "feat(scan): add browser image-loading, capture, and scan worker"
```

---

### Task 10: useTeamScan hook

**Files:**
- Create: `src/features/scan/useTeamScan.ts`
- Test: `src/features/scan/useTeamScan.test.ts`

**Interfaces:**
- Consumes: `scanTeamImage`, `loadReferenceDescriptors`, `filterByFormatLegal`, `blobToRgbaImage`.
- Produces: `useTeamScan(legalIds: Set<number>)` → `{ status, slots, error, scan(blob: Blob): Promise<void>, reset() }` where `status: 'idle' | 'scanning' | 'done' | 'error'`.

> The hook runs `scanTeamImage` on the main thread when no Worker is available (test/SSR) and offloads to `scan.worker.ts` in the browser. To keep it node-testable, `scanTeamImage` and `blobToRgbaImage` are injectable via an optional `deps` arg (default = real implementations). The test injects fakes.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/scan/useTeamScan.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTeamScan } from './useTeamScan';
import type { RgbaImage, ReferenceEntry, SlotResult } from './types';

const fakeImage: RgbaImage = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
const fakeSlots: SlotResult[] = [{ box: { x: 0, y: 0, w: 1, h: 1 }, candidates: [{ id: 25, score: 0.9 }] }];

describe('useTeamScan', () => {
  it('moves idle -> scanning -> done and exposes slots', async () => {
    const deps = {
      loadRefs: async (): Promise<ReferenceEntry[]> => [],
      blobToRgbaImage: async (): Promise<RgbaImage> => fakeImage,
      scanTeamImage: (): SlotResult[] => fakeSlots,
    };
    const { result } = renderHook(() => useTeamScan(new Set([25]), deps));
    expect(result.current.status).toBe('idle');
    await act(async () => { await result.current.scan(new Blob()); });
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.slots).toEqual(fakeSlots);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/useTeamScan.test.ts`
Expected: FAIL — cannot find module `./useTeamScan` (and possibly missing `@testing-library/react`).

- [ ] **Step 3: Ensure test deps, then implement**

If `@testing-library/react` is absent, install it:
```bash
npm install --save-dev @testing-library/react --legacy-peer-deps
```
```ts
// src/features/scan/useTeamScan.ts
import { useCallback, useState } from 'react';
import { scanTeamImage as realScan } from './scanImage';
import { loadReferenceDescriptors, filterByFormatLegal } from './referenceData';
import { blobToRgbaImage as realLoad } from './imageLoading';
import type { ReferenceEntry, RgbaImage, SlotResult } from './types';

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

export interface TeamScanDeps {
  loadRefs: () => Promise<ReferenceEntry[]>;
  blobToRgbaImage: (blob: Blob) => Promise<RgbaImage>;
  scanTeamImage: (img: RgbaImage, refs: ReferenceEntry[], topN: number) => SlotResult[];
}

const DEFAULT_DEPS: TeamScanDeps = {
  loadRefs: loadReferenceDescriptors,
  blobToRgbaImage: realLoad,
  scanTeamImage: realScan,
};

export function useTeamScan(legalIds: Set<number>, deps: TeamScanDeps = DEFAULT_DEPS) {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [slots, setSlots] = useState<SlotResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (blob: Blob) => {
    setStatus('scanning'); setError(null);
    try {
      const refs = filterByFormatLegal(await deps.loadRefs(), legalIds);
      const image = await deps.blobToRgbaImage(blob);
      setSlots(deps.scanTeamImage(image, refs, 3));
      setStatus('done');
    } catch (e) {
      setError((e as Error).message); setStatus('error');
    }
  }, [legalIds, deps]);

  const reset = useCallback(() => { setStatus('idle'); setSlots([]); setError(null); }, []);

  return { status, slots, error, scan, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/useTeamScan.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/useTeamScan.ts src/features/scan/useTeamScan.test.ts package.json package-lock.json
git commit -m "feat(scan): add useTeamScan hook with injectable deps"
```

---

### Task 11: ScanTeamModal confirm/correct UI

**Files:**
- Create: `src/features/scan/ScanTeamModal.tsx`

**Interfaces:**
- Consumes: `useTeamScan`, `pickImage`, `toParsedSets`, `PokemonBaseStats` (`@/components/molecules/PokemonSearchSelect`), `PokemonImage` (`@/components/atoms/PokemonImage`), `Modal` (`@/components/atoms/Modal`), `ParsedShowdownSet`.
- Produces: `ScanTeamModal` props `{ isOpen: boolean; onClose: () => void; onImport: (sets: ParsedShowdownSet[]) => void; pokemonList: PokemonBaseStats[] }`.

> React/DOM component — verified manually in Task 12's preview, not unit-tested.

- [ ] **Step 1: Implement the modal**

```tsx
// src/features/scan/ScanTeamModal.tsx
import React, { useMemo, useState } from 'react';
import Modal from '@/components/atoms/Modal';
import PokemonImage from '@/components/atoms/PokemonImage';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import { useTeamScan } from './useTeamScan';
import { pickImage } from './capture';
import { toParsedSets } from './toParsedSets';

interface ScanTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (sets: ParsedShowdownSet[]) => void;
  pokemonList: PokemonBaseStats[];
}

const ScanTeamModal: React.FC<ScanTeamModalProps> = ({ isOpen, onClose, onImport, pokemonList }) => {
  const legalIds = useMemo(() => new Set(pokemonList.map((p) => p.id)), [pokemonList]);
  const byId = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);
  const { status, slots, error, scan, reset } = useTeamScan(legalIds);
  // selectedIds[slotIndex] = chosen pokemon.id (defaults to each slot's top-1)
  const [selectedIds, setSelectedIds] = useState<(number | null)[]>([]);

  const startPick = async () => {
    const blob = await pickImage();
    if (blob) {
      await scan(blob);
    }
  };

  // When a scan completes, seed selections with each slot's top candidate.
  React.useEffect(() => {
    if (status === 'done') setSelectedIds(slots.map((s) => s.candidates[0]?.id ?? null));
  }, [status, slots]);

  const confirm = () => {
    const names = selectedIds
      .map((id) => (id != null ? byId.get(id)?.nameEn : undefined))
      .filter((n): n is string => !!n);
    if (names.length === 0) return;
    onImport(toParsedSets(names));
    handleClose();
  };

  const handleClose = () => { reset(); setSelectedIds([]); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Scan opponent team">
      <div className="space-y-4">
        {status === 'idle' && (
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={startPick}>
            Choose screenshot
          </button>
        )}
        {status === 'scanning' && <p>Scanning…</p>}
        {status === 'error' && <p className="text-red-600">Scan failed: {error}</p>}

        {status === 'done' && slots.length === 0 && (
          <p className="text-amber-600">
            Couldn't find the opponent's 6 tiles. Make sure the team-select column is fully visible, then
            <button className="ml-1 underline" onClick={startPick}>try another image</button>.
          </p>
        )}

        {status === 'done' && slots.map((slot, i) => {
          const top = slot.candidates[0];
          const lowConfidence = !top || top.score < 0.6;
          return (
            <div key={i} className={`flex items-center gap-3 p-2 rounded ${lowConfidence ? 'bg-amber-50' : ''}`}>
              <span className="w-5 text-sm text-gray-500">{i + 1}</span>
              {selectedIds[i] != null && <PokemonImage id={selectedIds[i]!} className="w-10 h-10" />}
              <div className="flex-1">
                <select
                  className="w-full border rounded p-1"
                  value={selectedIds[i] ?? ''}
                  onChange={(e) => {
                    const next = [...selectedIds];
                    next[i] = e.target.value === '' ? null : Number(e.target.value);
                    setSelectedIds(next);
                  }}
                >
                  {slot.candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {byId.get(c.id)?.nameEn ?? `#${c.id}`} ({Math.round(c.score * 100)}%)
                    </option>
                  ))}
                </select>
                <PokemonSearchSelect
                  pokemonList={pokemonList}
                  onSelect={(p) => {
                    const next = [...selectedIds];
                    next[i] = p.id;
                    setSelectedIds(next);
                  }}
                  placeholder="Override…"
                />
              </div>
            </div>
          );
        })}

        {status === 'done' && slots.length > 0 && (
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded border" onClick={handleClose}>Cancel</button>
            <button className="px-4 py-2 rounded bg-green-600 text-white" onClick={confirm}>Create team</button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ScanTeamModal;
```

> Verify the exact prop names of `Modal` and `PokemonSearchSelect` against their definitions when implementing; adjust the JSX to match (e.g. `PokemonSearchSelect`'s selection callback name). Keep the public `ScanTeamModalProps` contract unchanged.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors (fix prop-name mismatches surfaced here).

- [ ] **Step 3: Commit**

```bash
git add src/features/scan/ScanTeamModal.tsx
git commit -m "feat(scan): add ScanTeamModal confirm/correct UI"
```

---

### Task 12: Wire "Scan Team" into the Teams page + verify in preview

**Files:**
- Modify: `src/pages/Teams/index.tsx`

**Interfaces:**
- Consumes: `ScanTeamModal` (`@/features/scan/ScanTeamModal`), existing `handleImportTeam`, `pokemonList`, `isScanModalOpen` state.

- [ ] **Step 1: Add state + import**

In `src/pages/Teams/index.tsx`, add the import near the other organism imports:
```tsx
import ScanTeamModal from '@/features/scan/ScanTeamModal';
```
Add state next to `isImportModalOpen`:
```tsx
const [isScanModalOpen, setIsScanModalOpen] = useState(false);
```

- [ ] **Step 2: Add the button**

Next to the existing "Import Team" button (find where `setIsImportModalOpen(true)` is wired), add:
```tsx
<button
  onClick={() => setIsScanModalOpen(true)}
  className="px-4 py-2 rounded bg-purple-600 text-white"
>
  Scan Team
</button>
```

- [ ] **Step 3: Render the modal**

Next to where `<TeamShowdownImportModal ... onImport={handleImportTeam} />` is rendered, add:
```tsx
<ScanTeamModal
  isOpen={isScanModalOpen}
  onClose={() => setIsScanModalOpen(false)}
  onImport={handleImportTeam}
  pokemonList={pokemonList}
/>
```

- [ ] **Step 4: Type-check + run the test suite**

Run: `npm run type-check && npm test`
Expected: type-check clean; all scan tests pass.

- [ ] **Step 5: Manual verification in preview** (requires a generated `reference-descriptors.json` — Task 13)

Start the dev server, open `/teams`, click **Scan Team**, choose one of the `__fixtures__` screenshots, and confirm: 6 slots populate, each with a dropdown of candidates; overriding a slot updates its sprite; **Create team** navigates to the new team's detail page with 6 members. Capture a screenshot of the populated confirm modal as proof.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Teams/index.tsx
git commit -m "feat(scan): add Scan Team entry point on the Teams page"
```

---

### Task 13: Reference assets + golden-screenshot regression

**Files:**
- Create (manual asset step): `public/images/pokemon/menu-sprites/{id}.png` (Champions `Menu_CP` set, renamed to `pokemon.id`)
- Create: `public/images/pokemon/reference-descriptors.json` (generated)
- Create: `src/features/scan/__fixtures__/*.png` (the real labeled screenshots) + `src/features/scan/__fixtures__/labels.json`
- Test: `src/features/scan/golden.test.ts`

**Interfaces:**
- Consumes: `generateDescriptors` (build script), `scanTeamImage`, `parseReferenceMap`, `readPng`.

- [ ] **Step 1: Acquire and place reference sprites**

Obtain the Champions `Menu_CP` menu sprites (SV-style box icons). Rename each to `{pokemon.id}.png` (national-dex id; forms `≥10000`) and place under `public/images/pokemon/menu-sprites/`. Sanity-check coverage of the active format:
```bash
ls public/images/pokemon/menu-sprites/*.png | wc -l
```
Expected: at least the count of format-legal Pokémon (Reg M-B ≈ 309).

- [ ] **Step 2: Generate the descriptor asset**

Run:
```bash
npx tsx scripts/generate-sprite-descriptors.ts
```
Expected: `Wrote <N> descriptors to .../reference-descriptors.json` (N matches the sprite count).

- [ ] **Step 3: Add labeled fixtures**

Save the real Champions team-select screenshots into `src/features/scan/__fixtures__/` as PNG, and write ground truth:
```json
// src/features/scan/__fixtures__/labels.json
{
  "screenshot-1.png": [6, 142, 203, 727, 445, 700]
}
```
(Each array is the opponent's 6 `pokemon.id`s, top-to-bottom. Fill in real ids for each saved screenshot.)

- [ ] **Step 4: Write the golden regression test**

```ts
// src/features/scan/golden.test.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { readPng, generateDescriptors } from '../../../scripts/generate-sprite-descriptors';
import { parseReferenceMap } from './referenceData';
import { scanTeamImage } from './scanImage';

const FIX = path.resolve('src/features/scan/__fixtures__');
const labels: Record<string, number[]> = JSON.parse(fs.readFileSync(path.join(FIX, 'labels.json'), 'utf8'));
const refs = parseReferenceMap(generateDescriptors(path.resolve('public/images/pokemon/menu-sprites')));

describe('golden screenshots', () => {
  for (const [file, truth] of Object.entries(labels)) {
    it(`recovers the 6 opponents in ${file} (top-3)`, () => {
      const slots = scanTeamImage(readPng(path.join(FIX, file)), refs, 3);
      expect(slots.length).toBe(6);
      let top1 = 0;
      slots.forEach((s, i) => {
        const ids = s.candidates.map((c) => c.id);
        expect(ids).toContain(truth[i]);          // ground truth within top-3
        if (s.candidates[0]?.id === truth[i]) top1++;
      });
      expect(top1).toBeGreaterThanOrEqual(4);       // >= 4/6 exact on top-1
    });
  }
});
```

- [ ] **Step 5: Run the golden test; tune if needed**

Run: `npx vitest run src/features/scan/golden.test.ts`
Expected: PASS. If a slot misses, tune in this order: red-threshold `RedOpts`, the sprite-inset crop in `scanTeamImage` (inset the crop inside the tile to isolate the sprite from the red border), then `scoreDescriptors` weights. Re-run after each change.

- [ ] **Step 6: Commit**

```bash
git add public/images/pokemon/menu-sprites public/images/pokemon/reference-descriptors.json src/features/scan/__fixtures__ src/features/scan/golden.test.ts
git commit -m "test(scan): add reference sprites + golden-screenshot regression"
```

---

## Self-Review

**Spec coverage** (against `2026-06-30-opponent-team-scan-design.md`, Phase 1 scope):
- §3 architecture / file layout → Tasks 1–11 create the listed `src/features/scan/` modules. ✓
- §4 pipeline steps 1–6 → segmentation (T4), crop+fingerprint+match (T1–T5), confirm UI (T11), reuse `handleImportTeam` (T8, T12). ✓
- §4 4-channel fingerprint → T1–T2; shiny re-rank → T3. ✓
- §5 id-keyed reference + format scoping → T6 (id-keyed JSON), T7 (`filterByFormatLegal`). ✓
- §6 integration seam (Teams button, `ParsedShowdownSet[]`, `handleImportTeam`, `createTeam`) → T8, T12. ✓
- §7 graceful empty/low-confidence handling → T11 (empty-state message, low-confidence highlight, override). ✓ Runtime-failure → descriptor-only fallback is N/A in Phase 1 (descriptors *are* the engine).
- §8A build step → T6, run in T13. ✓
- §9 tests 1 (unit), 3 (coverage via golden refs), 4 (golden), 5 (format scoping) → T1–T5, T7, T13. ✓
- §11 footprint (Phase 1 ~50–130 KB blob, no runtime) → satisfied by the pure-JS design. ✓
- **Deferred to Phase 2 (own plan):** the tiny classifier, `classifier.ts`/`classMap.ts`, onnxruntime-web, training script, classifier fallback logic, class-map tests. Not in this plan by design.

**Placeholder scan:** every code/test step contains complete code; commands have expected output. The only intentionally-manual items are external **asset acquisition** (Menu_CP sprites, real screenshots, ground-truth ids) in T13 — unavoidable data inputs, clearly marked.

**Type consistency:** `RgbaImage`, `Descriptor`, `ReferenceEntry`, `Candidate`, `SlotResult`, `TileBox` defined in T1 and used identically throughout. `computeDescriptor`/`scoreDescriptors`/`matchTile`/`scanTeamImage`/`filterByFormatLegal`/`toParsedSets`/`useTeamScan` signatures match across producer and consumer tasks. `ScanTeamModal` props match its render site in T12. `ParsedShowdownSet` matches the real type read from `showdown-parser.ts`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-30-opponent-team-scan-phase1.md`.
