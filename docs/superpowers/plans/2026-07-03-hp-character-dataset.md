# HP Character Dataset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert existing one-Pokemon HP crops and `training/hp-golden.json` strings into a clean single-character training dataset for the tiny HP CNN.

**Architecture:** Reuse the current HP panel and glyph segmentation path, but write character samples instead of template JSON or annotated debug PNGs. The core extractor stays pure and testable; the CLI handles filesystem writes, class directories, and summary reporting.

**Tech Stack:** TypeScript, tsx, Vitest, pngjs, existing `src/features/scan/hpText.ts` glyph pipeline, existing `scripts/hp-accuracy-core.ts` `battleView` and `loadPng` helpers.

**Spec:** `docs/superpowers/specs/2026-07-03-hp-reader-design.md`

## Global Constraints

- Dataset images are single-character samples, not full HP-string samples.
- Supported labels are exactly `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `/`, `%`.
- Dataset directories are exactly `hp-reader/dataset/{0,1,2,3,4,5,6,7,8,9,slash,percent}`.
- Character sample images are clean `24 x 32` PNGs with no debug boxes drawn over them.
- If segmentation cannot align boxes to the expected HP string, skip that plate and report the reason.
- Opponent labels are percentage-only strings such as `43%`; do not infer current or max HP for opponents.
- No OCR engine; no new runtime dependency; this task only adds dataset extraction tooling.
- Tests: `npx vitest run <path>`. Type check: `npm run type-check`.

---

## File Structure

- Create `scripts/hp-character-dataset-core.ts`
  - Pure extraction helpers.
  - Converts expected HP strings into labels.
  - Selects/merges glyph boxes from the current HP mask pipeline.
  - Normalizes each selected box to a clean `24 x 32` RGBA sample.

- Create `scripts/hp-character-dataset-core.test.ts`
  - Unit tests for label mapping, percent merge behavior, normalization size, and extraction from a synthetic panel.

- Create `scripts/extract-hp-character-dataset.ts`
  - CLI and filesystem writer.
  - Reads `training/hp-golden.json`.
  - Walks `training/screenshots` and `training/hp-fixtures` when present.
  - Writes samples to `hp-reader/dataset`.
  - Writes class-order manifest to `hp-reader/models/classes.json`.

- Create `scripts/extract-hp-character-dataset.test.ts`
  - Unit tests for filename generation, PNG writing, and class manifest writing.

- Create `scripts/hp-character-dataset-golden.test.ts`
  - Smoke test against the current golden screenshots.

- Modify `package.json`
  - Add `build:hp-dataset`.

---

### Task 1: Pure Character Sample Extraction Core

**Files:**
- Create: `scripts/hp-character-dataset-core.ts`
- Test: `scripts/hp-character-dataset-core.test.ts`

**Interfaces:**
- Consumes:
  - `RgbaImage`, `TileBox` from `src/features/scan/types.ts`
  - `BinMask`, `whiteMask`, `hpTextRegion`, `extractGlyphs`, `clusterGlyphBoxes`, `filterSpecks`, `MASK_THRESHOLDS`, `GLYPH_PIPELINE_CONFIGS`, `plausibleGlyphShape` from `src/features/scan/hpText.ts`
- Produces:
  - `export const HP_DATASET_CLASSES: Array<{ char: string; className: string }>`
  - `export interface ExtractedHpCharacterSample`
  - `export interface PanelSampleResult`
  - `export function classNameForChar(char: string): string`
  - `export function charsForExpectedText(text: string): string[]`
  - `export function selectGlyphBoxes(mask: BinMask, clusters: TileBox[][], expectedText: string): TileBox[] | null`
  - `export function normalizeBoxToImage(mask: BinMask, box: TileBox, width?: number, height?: number, pad?: number): RgbaImage`
  - `export function samplesFromPanel(img: RgbaImage, panel: TileBox, expectedText: string): PanelSampleResult`

- [ ] **Step 1: Write the failing test**

Create `scripts/hp-character-dataset-core.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  classNameForChar,
  charsForExpectedText,
  normalizeBoxToImage,
  samplesFromPanel,
  selectGlyphBoxes,
} from './hp-character-dataset-core';
import type { BinMask } from '../src/features/scan/hpText';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

function blankImage(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}

function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, v: number): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * img.width + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
}

function mask(w: number, h: number): BinMask {
  return { bits: new Uint8Array(w * h), w, h };
}

describe('HP character dataset labels', () => {
  it('maps classifier characters to stable dataset directories', () => {
    expect(classNameForChar('0')).toBe('0');
    expect(classNameForChar('9')).toBe('9');
    expect(classNameForChar('/')).toBe('slash');
    expect(classNameForChar('%')).toBe('percent');
    expect(() => classNameForChar('O')).toThrow(/unsupported/i);
  });

  it('splits expected HP strings into validated character labels', () => {
    expect(charsForExpectedText('43%')).toEqual(['4', '3', '%']);
    expect(charsForExpectedText('177/177')).toEqual(['1', '7', '7', '/', '1', '7', '7']);
    expect(() => charsForExpectedText('10O/177')).toThrow(/unsupported/i);
  });
});

describe('selectGlyphBoxes', () => {
  it('merges a percent sign split into slash and dot components', () => {
    const boxes: TileBox[] = [
      { x: 0, y: 0, w: 5, h: 12 },
      { x: 8, y: 0, w: 5, h: 12 },
      { x: 18, y: 1, w: 3, h: 3 },
      { x: 20, y: 0, w: 4, h: 12 },
      { x: 24, y: 9, w: 3, h: 3 },
    ];
    const selected = selectGlyphBoxes(mask(32, 16), [boxes], '43%');
    expect(selected).not.toBeNull();
    expect(selected?.length).toBe(3);
    expect(selected?.[2]).toEqual({ x: 18, y: 0, w: 9, h: 12 });
  });
});

describe('normalizeBoxToImage', () => {
  it('renders a clean 24 x 32 character sample', () => {
    const m = mask(8, 12);
    for (let y = 2; y < 10; y++) {
      m.bits[y * m.w + 3] = 1;
      m.bits[y * m.w + 4] = 1;
    }
    const img = normalizeBoxToImage(m, { x: 2, y: 2, w: 4, h: 8 });
    expect(img.width).toBe(24);
    expect(img.height).toBe(32);
    expect(img.data.length).toBe(24 * 32 * 4);
    expect(Array.from(img.data).some((v) => v === 255)).toBe(true);
  });
});

describe('samplesFromPanel', () => {
  it('extracts labeled character samples from a synthetic HP text region', () => {
    const img = blankImage(80, 40);
    const panel: TileBox = { x: 10, y: 5, w: 60, h: 10 };
    fillRect(img, 12, 12, 2, 11, 255);
    fillRect(img, 22, 12, 6, 11, 255);

    const result = samplesFromPanel(img, panel, '12');
    expect(result.skipped).toBe(false);
    expect(result.samples.map((s) => s.char)).toEqual(['1', '2']);
    expect(result.samples.map((s) => s.className)).toEqual(['1', '2']);
    expect(result.samples.every((s) => s.image.width === 24 && s.image.height === 32)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run scripts/hp-character-dataset-core.test.ts
```

Expected: FAIL because `scripts/hp-character-dataset-core.ts` does not exist.

- [ ] **Step 3: Implement the core extractor**

Create `scripts/hp-character-dataset-core.ts`:

```ts
import {
  clusterGlyphBoxes,
  extractGlyphs,
  filterSpecks,
  GLYPH_PIPELINE_CONFIGS,
  hpTextRegion,
  MASK_THRESHOLDS,
  plausibleGlyphShape,
  whiteMask,
  type BinMask,
  type GlyphPipelineConfig,
} from '../src/features/scan/hpText';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

export const SAMPLE_WIDTH = 24;
export const SAMPLE_HEIGHT = 32;

export const HP_DATASET_CLASSES = [
  { char: '0', className: '0' },
  { char: '1', className: '1' },
  { char: '2', className: '2' },
  { char: '3', className: '3' },
  { char: '4', className: '4' },
  { char: '5', className: '5' },
  { char: '6', className: '6' },
  { char: '7', className: '7' },
  { char: '8', className: '8' },
  { char: '9', className: '9' },
  { char: '/', className: 'slash' },
  { char: '%', className: 'percent' },
];

const CLASS_BY_CHAR = new Map(HP_DATASET_CLASSES.map((entry) => [entry.char, entry.className]));

export interface ExtractedHpCharacterSample {
  char: string;
  className: string;
  charIndex: number;
  box: TileBox;
  thresholdFactor: number;
  configIndex: number;
  image: RgbaImage;
}

export interface PanelSampleResult {
  skipped: boolean;
  reason: string | null;
  samples: ExtractedHpCharacterSample[];
}

export interface SamplesFromPanelOptions {
  thresholdFactors?: number[];
  configs?: GlyphPipelineConfig[];
}

export function classNameForChar(char: string): string {
  const className = CLASS_BY_CHAR.get(char);
  if (!className) throw new Error(`unsupported HP character "${char}"`);
  return className;
}

export function charsForExpectedText(text: string): string[] {
  return [...text].map((char) => {
    classNameForChar(char);
    return char;
  });
}

function unionBoxes(boxes: TileBox[]): TileBox {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.w));
  const y2 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

function forceSplitToCount(mask: BinMask, boxes: TileBox[], count: number): TileBox[] | null {
  const out = [...boxes];
  while (out.length < count) {
    let idx = -1;
    for (let i = 0; i < out.length; i++) {
      if (out[i].w >= 6 && (idx < 0 || out[i].w > out[idx].w)) idx = i;
    }
    if (idx < 0) return null;

    const box = out[idx];
    let best = Math.round(box.w / 2);
    let bestCount = Infinity;
    for (let dx = Math.round(box.w * 0.25); dx <= Math.round(box.w * 0.75); dx++) {
      let filled = 0;
      for (let y = box.y; y < box.y + box.h; y++) {
        const x = box.x + dx;
        if (x >= 0 && x < mask.w && y >= 0 && y < mask.h && mask.bits[y * mask.w + x]) filled++;
      }
      if (filled < bestCount) {
        bestCount = filled;
        best = dx;
      }
    }

    out.splice(
      idx,
      1,
      { x: box.x, y: box.y, w: best, h: box.h },
      { x: box.x + best, y: box.y, w: box.w - best, h: box.h },
    );
  }
  return out;
}

function totalWidth(boxes: TileBox[]): number {
  return boxes.reduce((sum, b) => sum + b.w, 0);
}

export function selectGlyphBoxes(mask: BinMask, clusters: TileBox[][], expectedText: string): TileBox[] | null {
  const chars = charsForExpectedText(expectedText);
  const all = clusters.flat().sort((a, b) => a.x - b.x);
  const candidates = [...clusters.filter((c) => c.length >= 2), all].map((c) => [...c].sort((a, b) => a.x - b.x));

  const exact = candidates.find((c) => c.length === chars.length);
  if (exact) return exact;

  if (expectedText.endsWith('%')) {
    for (const candidate of candidates) {
      if (candidate.length <= chars.length || candidate.length > chars.length + 2) continue;
      const percentStart = chars.length - 1;
      return [...candidate.slice(0, percentStart), unionBoxes(candidate.slice(percentStart))];
    }
  }

  for (const candidate of [...clusters, all]) {
    if (candidate.length >= chars.length) continue;
    const split = forceSplitToCount(mask, candidate, chars.length);
    if (split) return split;
  }

  return null;
}

export function normalizeBoxToImage(
  mask: BinMask,
  box: TileBox,
  width = SAMPLE_WIDTH,
  height = SAMPLE_HEIGHT,
  pad = 2,
): RgbaImage {
  const source = {
    x: box.x - pad,
    y: box.y - pad,
    w: box.w + pad * 2,
    h: box.h + pad * 2,
  };
  const scale = Math.min(width / source.w, height / source.h);
  const drawW = Math.max(1, Math.round(source.w * scale));
  const drawH = Math.max(1, Math.round(source.h * scale));
  const left = Math.floor((width - drawW) / 2);
  const top = Math.floor((height - drawH) / 2);
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i + 3] = 255;
    }
  }

  for (let y = 0; y < drawH; y++) {
    for (let x = 0; x < drawW; x++) {
      const sx = Math.floor(source.x + (x + 0.5) / scale);
      const sy = Math.floor(source.y + (y + 0.5) / scale);
      const on = sx >= 0 && sy >= 0 && sx < mask.w && sy < mask.h && mask.bits[sy * mask.w + sx] > 0;
      if (!on) continue;
      const dx = left + x;
      const dy = top + y;
      const i = (dy * width + dx) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  return { data, width, height };
}

export function samplesFromPanel(
  img: RgbaImage,
  panel: TileBox,
  expectedText: string,
  options: SamplesFromPanelOptions = {},
): PanelSampleResult {
  const chars = charsForExpectedText(expectedText);
  const thresholdFactors = options.thresholdFactors ?? MASK_THRESHOLDS;
  const configs = options.configs ?? GLYPH_PIPELINE_CONFIGS;
  const reasons: string[] = [];

  for (const thresholdFactor of thresholdFactors) {
    const raw = whiteMask(img, hpTextRegion(panel, img), thresholdFactor);
    for (let configIndex = 0; configIndex < configs.length; configIndex++) {
      const { mask, boxes } = extractGlyphs(raw, configs[configIndex]);
      const clusters = clusterGlyphBoxes(filterSpecks(boxes, mask.h))
        .sort((a, b) => b.length - a.length || totalWidth(b) - totalWidth(a));
      const selected = selectGlyphBoxes(mask, clusters, expectedText);
      if (!selected) {
        reasons.push(`threshold ${thresholdFactor} config ${configIndex}: no ${chars.length}-glyph cluster`);
        continue;
      }
      const kept = selected.map((box, charIndex) => ({ box, char: chars[charIndex], charIndex }))
        .filter(({ box, char }) => plausibleGlyphShape(char, box));
      if (kept.length !== chars.length) {
        reasons.push(`threshold ${thresholdFactor} config ${configIndex}: implausible glyph shape`);
        continue;
      }

      return {
        skipped: false,
        reason: null,
        samples: kept.map(({ box, char, charIndex }) => ({
          char,
          className: classNameForChar(char),
          charIndex,
          box,
          thresholdFactor,
          configIndex,
          image: normalizeBoxToImage(mask, box),
        })),
      };
    }
  }

  return {
    skipped: true,
    reason: reasons.slice(0, 5).join('; '),
    samples: [],
  };
}
```

- [ ] **Step 4: Run the unit test**

Run:

```bash
npx vitest run scripts/hp-character-dataset-core.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add scripts/hp-character-dataset-core.ts scripts/hp-character-dataset-core.test.ts
git commit -m "feat: extract hp character samples"
```

---

### Task 2: Dataset Filesystem Writer And CLI

**Files:**
- Create: `scripts/extract-hp-character-dataset.ts`
- Test: `scripts/extract-hp-character-dataset.test.ts`

**Interfaces:**
- Consumes:
  - `HP_DATASET_CLASSES`, `ExtractedHpCharacterSample`, `samplesFromPanel` from `scripts/hp-character-dataset-core.ts`
  - `GoldenFile`, `battleView`, `loadPng` from `scripts/hp-accuracy-core.ts`
  - `detectBattlePanels` from `src/features/scan/battleDetection.ts`
- Produces:
  - `export interface ExtractDatasetOptions`
  - `export interface ExtractDatasetSummary`
  - `export function sampleFilename(screenshot: string, sourceName: string, side: "opponent" | "player", plateIndex: number, sample: ExtractedHpCharacterSample): string`
  - `export function writeRgbaPng(img: RgbaImage, file: string): void`
  - `export function writeClassesJson(file?: string): void`
  - `export function extractDataset(options?: Partial<ExtractDatasetOptions>): ExtractDatasetSummary`
  - `export function parseArgs(argv: string[]): ExtractDatasetOptions`

- [ ] **Step 1: Write the failing test**

Create `scripts/extract-hp-character-dataset.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PNG } from 'pngjs';
import { HP_DATASET_CLASSES, type ExtractedHpCharacterSample } from './hp-character-dataset-core';
import {
  parseArgs,
  sampleFilename,
  writeClassesJson,
  writeRgbaPng,
} from './extract-hp-character-dataset';
import type { RgbaImage } from '../src/features/scan/types';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hp-dataset-test-'));
}

function sample(char: string, className: string): ExtractedHpCharacterSample {
  return {
    char,
    className,
    charIndex: 2,
    box: { x: 1, y: 2, w: 3, h: 4 },
    thresholdFactor: 0.8,
    configIndex: 0,
    image: { data: new Uint8ClampedArray(24 * 32 * 4), width: 24, height: 32 },
  };
}

describe('extract HP character dataset CLI helpers', () => {
  it('builds stable sample filenames without raw slash or percent characters', () => {
    expect(sampleFilename('Xnip2026-07-03_02-11-37.png', 'screenshots', 'player', 0, sample('/', 'slash')))
      .toBe('Xnip2026-07-03_02-11-37__screenshots__player1__02__slash.png');
    expect(sampleFilename('screen one.png', 'fixtures', 'opponent', 1, sample('%', 'percent')))
      .toBe('screen_one__fixtures__opponent2__02__percent.png');
  });

  it('writes an RGBA PNG with the expected dimensions', () => {
    const dir = tmpDir();
    const img: RgbaImage = { data: new Uint8ClampedArray(24 * 32 * 4), width: 24, height: 32 };
    img.data[0] = 255;
    img.data[1] = 255;
    img.data[2] = 255;
    img.data[3] = 255;

    const file = path.join(dir, 'sample.png');
    writeRgbaPng(img, file);
    const png = PNG.sync.read(fs.readFileSync(file));
    expect(png.width).toBe(24);
    expect(png.height).toBe(32);
  });

  it('writes class order as classifier characters', () => {
    const file = path.join(tmpDir(), 'classes.json');
    writeClassesJson(file);
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual(HP_DATASET_CLASSES.map((entry) => entry.char));
  });

  it('parses output, clean flag, and positional source dirs', () => {
    expect(parseArgs(['--clean', '--out', 'tmp/hp', 'training/screenshots'])).toEqual({
      clean: true,
      outDir: 'tmp/hp',
      classesPath: 'hp-reader/models/classes.json',
      goldenPath: 'training/hp-golden.json',
      sourceDirs: ['training/screenshots'],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run scripts/extract-hp-character-dataset.test.ts
```

Expected: FAIL because `scripts/extract-hp-character-dataset.ts` does not exist.

- [ ] **Step 3: Implement the CLI and writer**

Create `scripts/extract-hp-character-dataset.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import { detectBattlePanels } from '../src/features/scan/battleDetection';
import type { RgbaImage, ScanSide } from '../src/features/scan/types';
import { battleView, loadPng, type GoldenFile } from './hp-accuracy-core';
import {
  HP_DATASET_CLASSES,
  samplesFromPanel,
  type ExtractedHpCharacterSample,
} from './hp-character-dataset-core';

export interface ExtractDatasetOptions {
  goldenPath: string;
  sourceDirs: string[];
  outDir: string;
  classesPath: string;
  clean: boolean;
}

export interface ExtractDatasetSummary {
  readablePlates: number;
  written: number;
  skipped: number;
  skipReasons: string[];
}

const DEFAULT_OPTIONS: ExtractDatasetOptions = {
  goldenPath: 'training/hp-golden.json',
  sourceDirs: ['training/screenshots', 'training/hp-fixtures'],
  outDir: 'hp-reader/dataset',
  classesPath: 'hp-reader/models/classes.json',
  clean: false,
};

function safeStem(name: string): string {
  return path.basename(name, path.extname(name)).replace(/[^a-zA-Z0-9_-]+/g, '_');
}

export function sampleFilename(
  screenshot: string,
  sourceName: string,
  side: ScanSide,
  plateIndex: number,
  sample: ExtractedHpCharacterSample,
): string {
  const index = String(sample.charIndex).padStart(2, '0');
  return `${safeStem(screenshot)}__${safeStem(sourceName)}__${side}${plateIndex + 1}__${index}__${sample.className}.png`;
}

export function writeRgbaPng(img: RgbaImage, file: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const png = new PNG({ width: img.width, height: img.height });
  png.data.set(img.data);
  fs.writeFileSync(file, PNG.sync.write(png));
}

export function writeClassesJson(file = DEFAULT_OPTIONS.classesPath): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(HP_DATASET_CLASSES.map((entry) => entry.char), null, 2)}\n`);
}

function ensureClassDirs(outDir: string): void {
  for (const entry of HP_DATASET_CLASSES) {
    fs.mkdirSync(path.join(outDir, entry.className), { recursive: true });
  }
}

export function extractDataset(options: Partial<ExtractDatasetOptions> = {}): ExtractDatasetSummary {
  const resolved: ExtractDatasetOptions = { ...DEFAULT_OPTIONS, ...options };
  const golden: GoldenFile = JSON.parse(fs.readFileSync(resolved.goldenPath, 'utf8'));
  const sourceDirs = resolved.sourceDirs.filter((dir) => fs.existsSync(dir));
  const summary: ExtractDatasetSummary = { readablePlates: 0, written: 0, skipped: 0, skipReasons: [] };

  if (resolved.clean) fs.rmSync(resolved.outDir, { recursive: true, force: true });
  ensureClassDirs(resolved.outDir);
  writeClassesJson(resolved.classesPath);

  for (const sourceDir of sourceDirs) {
    const sourceName = path.basename(sourceDir);
    for (const [screenshot, entry] of Object.entries(golden)) {
      const file = path.join(sourceDir, screenshot);
      if (!fs.existsSync(file)) continue;
      const img = battleView(loadPng(file));

      for (const side of ['opponent', 'player'] as const) {
        const panels = detectBattlePanels(img, side);
        entry[side].forEach((expected, plateIndex) => {
          if (expected == null) return;
          summary.readablePlates++;
          const panel = panels[plateIndex];
          if (!panel) {
            summary.skipped++;
            summary.skipReasons.push(`${sourceName}/${screenshot} ${side}${plateIndex + 1}: panel not detected`);
            return;
          }

          const result = samplesFromPanel(img, panel, expected);
          if (result.skipped || result.samples.length === 0) {
            summary.skipped++;
            summary.skipReasons.push(
              `${sourceName}/${screenshot} ${side}${plateIndex + 1} "${expected}": ${result.reason ?? 'no samples'}`,
            );
            return;
          }

          for (const sample of result.samples) {
            const fileName = sampleFilename(screenshot, sourceName, side, plateIndex, sample);
            writeRgbaPng(sample.image, path.join(resolved.outDir, sample.className, fileName));
            summary.written++;
          }
        });
      }
    }
  }

  return summary;
}

export function parseArgs(argv: string[]): ExtractDatasetOptions {
  const parsed: ExtractDatasetOptions = { ...DEFAULT_OPTIONS, sourceDirs: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--clean') {
      parsed.clean = true;
    } else if (arg === '--out') {
      const value = argv[++i];
      if (!value) throw new Error('--out requires a directory');
      parsed.outDir = value;
    } else if (arg === '--golden') {
      const value = argv[++i];
      if (!value) throw new Error('--golden requires a JSON path');
      parsed.goldenPath = value;
    } else if (arg === '--classes') {
      const value = argv[++i];
      if (!value) throw new Error('--classes requires a JSON path');
      parsed.classesPath = value;
    } else {
      parsed.sourceDirs.push(arg);
    }
  }
  if (parsed.sourceDirs.length === 0) parsed.sourceDirs = [...DEFAULT_OPTIONS.sourceDirs];
  return parsed;
}

if (require.main === module) {
  const summary = extractDataset(parseArgs(process.argv.slice(2)));
  console.log(`HP character dataset: ${summary.written} sample(s) from ${summary.readablePlates} readable plate(s); skipped ${summary.skipped}.`);
  for (const reason of summary.skipReasons.slice(0, 30)) console.log(`  skip ${reason}`);
  if (summary.skipReasons.length > 30) console.log(`  ... ${summary.skipReasons.length - 30} more skip(s)`);
}
```

- [ ] **Step 4: Run the CLI writer tests**

Run:

```bash
npx vitest run scripts/extract-hp-character-dataset.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add scripts/extract-hp-character-dataset.ts scripts/extract-hp-character-dataset.test.ts
git commit -m "feat: write hp character dataset"
```

---

### Task 3: Golden Smoke Test And Package Script

**Files:**
- Create: `scripts/hp-character-dataset-golden.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes:
  - `extractDataset` from `scripts/extract-hp-character-dataset.ts`
  - current `training/hp-golden.json`
  - current `training/screenshots`
- Produces:
  - `npm run build:hp-dataset`, which writes `hp-reader/dataset` and `hp-reader/models/classes.json`

- [ ] **Step 1: Write the failing golden smoke test**

Create `scripts/hp-character-dataset-golden.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extractDataset } from './extract-hp-character-dataset';

describe('HP character dataset golden extraction', () => {
  it.skipIf(!fs.existsSync('training/hp-golden.json') || !fs.existsSync('training/screenshots'))(
    'writes clean character samples from the current golden screenshots',
    () => {
      const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-character-dataset-'));
      const classesPath = path.join(outDir, 'classes.json');
      const summary = extractDataset({
        goldenPath: 'training/hp-golden.json',
        sourceDirs: ['training/screenshots'],
        outDir,
        classesPath,
        clean: true,
      });

      expect(summary.readablePlates).toBeGreaterThan(0);
      expect(summary.written).toBeGreaterThan(0);
      expect(fs.existsSync(classesPath)).toBe(true);
      expect(fs.readdirSync(path.join(outDir, '1')).some((name) => name.endsWith('.png'))).toBe(true);
    },
    600_000,
  );
});
```

- [ ] **Step 2: Run the smoke test**

Run:

```bash
npx vitest run scripts/hp-character-dataset-golden.test.ts
```

Expected: PASS after Tasks 1 and 2. If it fails with `summary.written` equal to `0`, inspect `summary.skipReasons` by running `npx tsx scripts/extract-hp-character-dataset.ts --out /tmp/hp-character-dataset-debug training/screenshots` and fix the alignment logic before continuing.

- [ ] **Step 3: Add the package script**

Modify `package.json` under `"scripts"` so the end of the block reads:

```json
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "build:hp-dataset": "tsx scripts/extract-hp-character-dataset.ts --clean"
```

- [ ] **Step 4: Run all dataset tests**

Run:

```bash
npx vitest run scripts/hp-character-dataset-core.test.ts scripts/extract-hp-character-dataset.test.ts scripts/hp-character-dataset-golden.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the dataset build command**

Run:

```bash
npm run build:hp-dataset
```

Expected output contains:

```text
HP character dataset:
```

Expected files:

```text
hp-reader/dataset/0/
hp-reader/dataset/1/
hp-reader/dataset/2/
hp-reader/dataset/3/
hp-reader/dataset/4/
hp-reader/dataset/5/
hp-reader/dataset/6/
hp-reader/dataset/7/
hp-reader/dataset/8/
hp-reader/dataset/9/
hp-reader/dataset/slash/
hp-reader/dataset/percent/
hp-reader/models/classes.json
```

- [ ] **Step 6: Run type-check**

Run:

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add package.json scripts/hp-character-dataset-golden.test.ts hp-reader/models/classes.json hp-reader/dataset
git commit -m "test: verify hp character dataset extraction"
```

If `hp-reader/dataset` is too large after local extraction, inspect its size with `du -sh hp-reader/dataset`. If it is larger than 10 MB, commit only `hp-reader/models/classes.json` and add `hp-reader/dataset/` to `.gitignore` in this task before committing.

---

## Verification

After all tasks:

```bash
npx vitest run scripts/hp-character-dataset-core.test.ts scripts/extract-hp-character-dataset.test.ts scripts/hp-character-dataset-golden.test.ts
npm run type-check
npm run build:hp-dataset
```

Check the dataset distribution:

```bash
find hp-reader/dataset -mindepth 1 -maxdepth 1 -type d -print | sort
find hp-reader/dataset -type f -name '*.png' | wc -l
```

Manual QA:

```bash
open hp-reader/dataset/1
open hp-reader/dataset/slash
open hp-reader/dataset/percent
```

Each PNG should contain one white character on black background, sized `24 x 32`, with no red debug boxes.

## Follow-Up Plans

This plan stops after dataset extraction. Separate plans should cover:

- PyTorch training and ONNX export.
- Browser ONNX inference wrapper.
- Runtime reader integration and template fallback.
