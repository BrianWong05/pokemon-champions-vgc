# HP Reader Accuracy Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the HP glyph reader from ~20% to ≥80% exact reads with zero wrong reads, verified against both Node (pngjs) and browser (canvas) pixels.

**Architecture:** A golden harness (ground-truth JSON + sweep script + browser-decoded PNG fixtures) referees everything. Templates are rebuilt from every readable golden plate in both decoders. Matching moves from binary Hamming to quantized-grayscale L1 with a best-vs-other-char margin rule; the read loop gains a mask-threshold ladder.

**Tech Stack:** TypeScript (tsx/vitest, pngjs), Python Playwright (one-time fixture capture), existing `hpText.ts` v2 pipeline (adaptive mask, frame cleanup, shear ladder).

**Spec:** `docs/superpowers/specs/2026-07-03-hp-reader-accuracy-design.md`

## Global Constraints

- Policy A: never wrong, prefer blank — `wrong` must be 0 on the golden set in BOTH runtimes; recall target ≥ 80%.
- No OCR engine; no new runtime dependencies; templates stay generated artifacts (`src/features/scan/hpGlyphTemplates.ts` + `training/hp-glyph-templates.json`).
- Browser fixtures live in `training/hp-fixtures/` and are **gitignored** (tens of MB); the capture script regenerates them.
- Template `bits` stays a 256-char string, but each char is now a coverage level `'0'..'9'` (was binary `'0'/'1'`).
- Tests: `npx vitest run <path>`. Type check: `npx tsc --noEmit`.

---

### Task 1: Golden file + Node sweep harness

**Files:**
- Create: `training/hp-golden.json`
- Create: `scripts/hp-accuracy-core.ts`
- Create: `scripts/hp-accuracy.ts` (CLI)
- Test: `scripts/hp-accuracy-core.test.ts`

**Interfaces:**
- Produces (from `hp-accuracy-core.ts`; Tasks 2, 4, 5 rely on these exactly):
  - `export type GoldenFile = Record<string, { opponent: (string | null)[]; player: (string | null)[] }>`
  - `export interface SweepSummary { results: PlateResult[]; readable: number; read: number; wrong: number }` with `PlateResult { screenshot; side; index; expected: string | null; got: string | null }`
  - `export function sweep(golden: GoldenFile, load: (name: string) => RgbaImage): SweepSummary`
  - `export function loadPng(file: string): RgbaImage`
  - `export function battleView(img: RgbaImage): RgbaImage` (game-rect fallback for framed captures)
  - `export function readingToString(r: HpReading | null): string | null`

- [ ] **Step 1: Write `training/hp-golden.json`** — ground truth per detected panel, left→right; `null` = human-unreadable (occluded), excluded from recall; array length MUST equal the number of panels detection returns:

```json
{
  "Xnip2026-07-01_03-26-01.png": { "opponent": ["87%", "90%"], "player": ["197/197", "121/202"] },
  "Xnip2026-07-01_05-34-16.png": { "opponent": ["86%", "16%"], "player": ["167/167", "197/197"] },
  "Xnip2026-07-01_18-08-40.png": { "opponent": ["100%", "100%"], "player": ["202/202", "193/193"] },
  "Xnip2026-07-01_19-38-20.png": { "opponent": ["29%", "1%"], "player": ["81/202", "193/193"] },
  "Xnip2026-07-01_19-42-26.png": { "opponent": ["100%", "100%"], "player": ["157/157", "137/137"] },
  "Xnip2026-07-01_20-06-38.png": { "opponent": ["16%", "100%"], "player": [] },
  "Xnip2026-07-01_20-23-43.png": { "opponent": ["100%", "100%"], "player": ["170/170"] },
  "Xnip2026-07-01_20-24-28.png": { "opponent": ["100%", "100%"], "player": ["170/170", null] },
  "Xnip2026-07-01_20-29-11.png": { "opponent": ["100%", "100%"], "player": ["30/170", "149/185"] }
}
```

- [ ] **Step 2: Write the failing test** (`scripts/hp-accuracy-core.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { sweep, loadPng, readingToString, type GoldenFile } from './hp-accuracy-core';

describe('readingToString', () => {
  it('formats percent and fraction readings', () => {
    expect(readingToString({ percent: 29 })).toBe('29%');
    expect(readingToString({ percent: 40, current: 81, max: 202 })).toBe('81/202');
    expect(readingToString(null)).toBeNull();
  });
});

describe('sweep', () => {
  it('pairs golden entries with detected panels and counts reads/wrongs', () => {
    const golden: GoldenFile = {
      'Xnip2026-07-01_19-38-20.png': { opponent: ['29%', '1%'], player: ['81/202', '193/193'] },
    };
    const summary = sweep(golden, (n) => loadPng(path.join('training/screenshots', n)));
    expect(summary.results.length).toBe(4);
    expect(summary.readable).toBe(4);
    expect(summary.wrong).toBe(0); // policy A: whatever recall is, wrong must be 0
  }, 120_000);

  it('throws loudly when panel count and golden length disagree', () => {
    const golden: GoldenFile = {
      'Xnip2026-07-01_19-38-20.png': { opponent: ['29%'], player: [] },
    };
    expect(() => sweep(golden, (n) => loadPng(path.join('training/screenshots', n)))).toThrow(/panels/);
  }, 120_000);
});
```

- [ ] **Step 3: Run to verify it fails** — `npx vitest run scripts/hp-accuracy-core.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement `scripts/hp-accuracy-core.ts`:**

```ts
// Golden-set sweep for the HP reader: runs the FULL production path
// (panel detection + game-rect fallback + readHpFromPanel) over ground-truth
// plates and reports recall / wrong-reads. The injectable loader lets the
// same sweep run over training/screenshots (pngjs pixels) or
// training/hp-fixtures (browser canvas pixels re-encoded losslessly as PNG).
import * as fs from 'fs';
import { PNG } from 'pngjs';
import { detectBattlePanels } from '../src/features/scan/battleDetection';
import { inferGameRect } from '../src/features/scan/gameRect';
import { cropImage } from '../src/features/scan/segmentation';
import { readHpFromPanel, type HpReading } from '../src/features/scan/hpText';
import type { RgbaImage } from '../src/features/scan/types';

export type GoldenFile = Record<string, { opponent: (string | null)[]; player: (string | null)[] }>;

export interface PlateResult {
  screenshot: string;
  side: 'opponent' | 'player';
  index: number;
  expected: string | null;
  got: string | null;
}

export interface SweepSummary {
  results: PlateResult[];
  readable: number;
  read: number;
  wrong: number;
}

export function loadPng(file: string): RgbaImage {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

export function readingToString(r: HpReading | null): string | null {
  if (!r) return null;
  return r.current != null && r.max != null ? `${r.current}/${r.max}` : `${r.percent}%`;
}

// Framed captures (browser/video frames) need the inferred game rect before
// panel detection works — mirror of the app pipeline's fallback.
export function battleView(img: RgbaImage): RgbaImage {
  if (detectBattlePanels(img, 'opponent').length === 2) return img;
  const rect = inferGameRect(img);
  if (!rect) return img;
  const sub = cropImage(img, rect);
  return detectBattlePanels(sub, 'opponent').length === 2 ? sub : img;
}

export function sweep(golden: GoldenFile, load: (name: string) => RgbaImage): SweepSummary {
  const results: PlateResult[] = [];
  for (const [name, entry] of Object.entries(golden)) {
    const img = battleView(load(name));
    for (const side of ['opponent', 'player'] as const) {
      const expected = entry[side];
      const panels = detectBattlePanels(img, side);
      if (panels.length !== expected.length) {
        throw new Error(
          `${name} ${side}: detected ${panels.length} panels but golden lists ${expected.length} — update training/hp-golden.json`,
        );
      }
      panels.forEach((panel, i) => {
        results.push({
          screenshot: name,
          side,
          index: i,
          expected: expected[i],
          got: readingToString(readHpFromPanel(img, panel)),
        });
      });
    }
  }
  const readable = results.filter((r) => r.expected != null);
  return {
    results,
    readable: readable.length,
    read: readable.filter((r) => r.got === r.expected).length,
    wrong: readable.filter((r) => r.got != null && r.got !== r.expected).length,
  };
}
```

- [ ] **Step 5: Implement the CLI** (`scripts/hp-accuracy.ts`):

```ts
// Usage: npx tsx scripts/hp-accuracy.ts            (Node/pngjs pixels)
//        npx tsx scripts/hp-accuracy.ts --browser  (canvas-decoded fixtures)
import * as fs from 'fs';
import * as path from 'path';
import { sweep, loadPng, type GoldenFile } from './hp-accuracy-core';

const browser = process.argv.includes('--browser');
const dir = path.resolve(browser ? 'training/hp-fixtures' : 'training/screenshots');
if (browser && !fs.existsSync(dir)) {
  console.error('No fixtures — run: python3 scripts/capture-browser-fixtures.py');
  process.exit(2);
}
const golden: GoldenFile = JSON.parse(fs.readFileSync('training/hp-golden.json', 'utf8'));
const summary = sweep(golden, (n) => loadPng(path.join(dir, n)));

for (const r of summary.results) {
  const mark = r.expected == null ? '·' : r.got === r.expected ? '✓' : r.got == null ? '✗ miss' : `!! WRONG`;
  console.log(`${mark}  ${r.screenshot} ${r.side}[${r.index}]  expected=${r.expected ?? '(unreadable)'} got=${r.got ?? '-'}`);
}
const pct = summary.readable ? Math.round((summary.read / summary.readable) * 100) : 0;
console.log(`\n[${browser ? 'browser' : 'node'}] recall ${summary.read}/${summary.readable} (${pct}%) · wrong ${summary.wrong}`);
process.exit(summary.wrong > 0 ? 1 : 0);
```

- [ ] **Step 6: Run tests** — `npx vitest run scripts/hp-accuracy-core.test.ts` → PASS. Then `npx tsx scripts/hp-accuracy.ts` and **record the baseline** (expected ≈ recall 6/30 (~20%) · wrong 0). If the count-mismatch throw fires for any screenshot, fix that entry's array length in hp-golden.json to match detection (that is the harness working as designed).

- [ ] **Step 7: Commit** — `git add training/hp-golden.json scripts/hp-accuracy*.ts && git commit -m "feat(scan): HP golden set + accuracy sweep harness"`

---

### Task 2: Browser-pixel fixtures

**Files:**
- Create: `scripts/capture-browser-fixtures.py`
- Modify: `.gitignore` (add `training/hp-fixtures/`)

**Interfaces:**
- Consumes: `training/hp-golden.json` (file list).
- Produces: `training/hp-fixtures/<same-screenshot-name>.png` — PNG re-encodings of the CANVAS-DECODED pixels (canvas `toDataURL('image/png')` is lossless over the canvas buffer, and pngjs decoding a PNG is byte-exact, so `loadPng` on a fixture yields exactly what the app's `blobToRgbaImage` produces).

- [ ] **Step 1: Write the capture script:**

```python
# Re-encode each golden screenshot through the BROWSER's image decode path
# (blob -> <img> -> canvas), exactly like src/features/scan/imageLoading.ts,
# and save the canvas pixels as PNG fixtures for the accuracy sweep.
# Usage: python3 scripts/capture-browser-fixtures.py
import base64, json, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "training", "screenshots")
OUT = os.path.join(ROOT, "training", "hp-fixtures")
os.makedirs(OUT, exist_ok=True)

JS = """
async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('decode failed'));
    el.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  return canvas.toDataURL('image/png');
}
"""

golden = json.load(open(os.path.join(ROOT, "training", "hp-golden.json")))
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("about:blank")
    for name in golden:
        with open(os.path.join(SHOTS, name), "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        data_url = page.evaluate(JS, b64)
        png = base64.b64decode(data_url.split(",", 1)[1])
        with open(os.path.join(OUT, name), "wb") as f:
            f.write(png)
        print("captured", name)
    browser.close()
print("done ->", OUT)
```

- [ ] **Step 2: Gitignore fixtures** — append to `.gitignore`:

```
# browser-decoded HP fixtures (regenerate: python3 scripts/capture-browser-fixtures.py)
training/hp-fixtures/
```

- [ ] **Step 3: Run it** — `python3 scripts/capture-browser-fixtures.py` → 9 files in `training/hp-fixtures/`. Sanity: `npx tsx -e "import { loadPng } from './scripts/hp-accuracy-core'; const a = loadPng('training/screenshots/Xnip2026-07-01_19-38-20.png'); const b = loadPng('training/hp-fixtures/Xnip2026-07-01_19-38-20.png'); console.log('same dims', a.width === b.width && a.height === b.height); let d = 0; for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) d++; console.log('differing bytes', d);"` — expect same dims and a NONZERO differing-byte count (that difference is the whole point).

- [ ] **Step 4: Baseline the browser side** — `npx tsx scripts/hp-accuracy.ts --browser`; record recall and wrong (a wrong > 0 here reproduces the `1%`→`7%` bug and is expected UNTIL Task 4).

- [ ] **Step 5: Commit** — `git add scripts/capture-browser-fixtures.py .gitignore && git commit -m "feat(scan): browser-decoded pixel fixtures for the HP golden sweep"`

---

### Task 3: Grayscale L1 matching + margin rule

**Files:**
- Modify: `src/features/scan/hpText.ts` (`normalizeGlyph`, `matchGlyph`, constants; `whiteMask` threshold param; `readHpFromPanel` threshold ladder)
- Test: `src/features/scan/hpText.test.ts` (update roundtrip; add quantization, margin, threshold tests)

**Interfaces:**
- `normalizeGlyph(mask: BinMask, box: TileBox): Uint8Array` — now returns 256 cells of coverage LEVELS `0..9` (was 0/1). Template `bits` strings encode the same levels as chars `'0'..'9'`; `charCodeAt(i) - 48` still decodes.
- `matchGlyph(bits: Uint8Array, hFrac: number, templates?: GlyphTemplate[]): string | null` — signature unchanged; internally L1 distance + margin rule.
- `whiteMask(img: RgbaImage, box: TileBox, thresholdFactor?: number): BinMask` (default 0.8 — existing behavior).
- New exported constant `MASK_THRESHOLDS: number[]` used by `readHpFromPanel` and (Task 4) the builder.

- [ ] **Step 1: Update/extend tests.** In `hpText.test.ts`, replace the binary roundtrip block and add:

```ts
describe('normalizeGlyph quantization', () => {
  it('reports partial cell coverage as intermediate levels', () => {
    // 8x8 box onto a 16x16 grid: each cell covers half a source pixel column,
    // so a checkerboard source yields mid levels, not 0/1.
    const rows = Array.from({ length: 8 }, (_, y) => (y % 2 ? '#.#.#.#.' : '.#.#.#.#'));
    const mask = maskOf(rows);
    const levels = normalizeGlyph(mask, { x: 0, y: 0, w: 8, h: 8 });
    expect(Math.max(...levels)).toBeLessThanOrEqual(9);
    expect(levels.some((v) => v > 0 && v < 9)).toBe(true);
  });
});

describe('matchGlyph margin rule', () => {
  const glyph = (fill: number) => new Uint8Array(256).fill(fill);
  const tpl = (char: string, fill: number) => ({ char, bits: Array.from(glyph(fill)).join(''), hFrac: 1 });

  it('accepts a clear winner', () => {
    expect(matchGlyph(glyph(9), 1, [tpl('8', 9), tpl('1', 0)])).toBe('8');
  });

  it('rejects when two different chars are nearly equally close', () => {
    // glyph fill 5 sits between templates '1' (4) and '7' (6): margin too thin.
    expect(matchGlyph(glyph(5), 1, [tpl('1', 4), tpl('7', 6)])).toBeNull();
  });

  it('is not blocked by near-duplicate templates of the SAME char', () => {
    expect(matchGlyph(glyph(9), 1, [tpl('8', 9), tpl('8', 8), tpl('1', 0)])).toBe('8');
  });
});

describe('whiteMask threshold factor', () => {
  it('lower factor admits dimmer pixels', () => {
    const img: RgbaImage = { data: new Uint8ClampedArray(4 * 4 * 4), width: 4, height: 4 };
    const set = (i: number, v: number) => { img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; };
    set(0, 255); set(1, 190); // peak 255; 190 < 0.8*255 but > 0.72*255
    const strict = whiteMask(img, { x: 0, y: 0, w: 4, h: 4 }, 0.8);
    const loose = whiteMask(img, { x: 0, y: 0, w: 4, h: 4 }, 0.72);
    expect(strict.bits[1]).toBe(0);
    expect(loose.bits[1]).toBe(1);
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run src/features/scan/hpText.test.ts` → new tests FAIL.

- [ ] **Step 3: Implement in `hpText.ts`:**

Constants (replace `MAX_HAMMING`):

```ts
const QUANT = 9;                 // coverage levels per cell: 0..9
const MAX_DIST = 0.1;            // mean |Δlevel| / QUANT, 0..1 — tuned in Task 4
const MIN_MARGIN = 0.02;         // best other-char distance must exceed best by this
export const MASK_THRESHOLDS = [0.8, 0.72, 0.88];
```

`normalizeGlyph` — same aspect-preserving area-average loops, but the cell write becomes:

```ts
      out[gy * GLYPH_SIZE + gx] = total > 0 ? Math.min(QUANT, Math.floor((on / total) * (QUANT + 1))) : 0;
```

`matchGlyph` — L1 + margin (same signature; keep the existing `hFrac` gate and `bits.length` guard):

```ts
export function matchGlyph(
  bits: Uint8Array,
  hFrac: number,
  templates: GlyphTemplate[] = HP_GLYPH_TEMPLATES,
): string | null {
  const norm = bits.length * QUANT;
  let bestChar: string | null = null;
  let bestDist = Infinity;
  let bestOther = Infinity; // best distance among chars OTHER than bestChar
  for (const template of templates) {
    if (template.bits.length !== bits.length) continue;
    if (Math.abs(template.hFrac - hFrac) > 0.25) continue;
    let sum = 0;
    for (let i = 0; i < bits.length; i++) {
      sum += Math.abs(bits[i] - (template.bits.charCodeAt(i) - 48));
    }
    const dist = sum / norm;
    if (dist < bestDist) {
      if (template.char !== bestChar && bestChar !== null) bestOther = bestDist;
      bestChar = template.char;
      bestDist = dist;
    } else if (template.char !== bestChar && dist < bestOther) {
      bestOther = dist;
    }
  }
  if (bestChar === null || bestDist > MAX_DIST) return null;
  if (bestOther - bestDist < MIN_MARGIN) return null; // ambiguous (e.g. 1 vs 7) -> blank
  return bestChar;
}
```

`whiteMask` — add the factor:

```ts
export function whiteMask(img: RgbaImage, box: TileBox, thresholdFactor = 0.8): BinMask {
  // ...peak scan unchanged...
  const threshold = Math.max(120, Math.round(peak * thresholdFactor));
  // ...second pass unchanged...
}
```

`readHpFromPanel` — wrap the existing config ladder in a threshold ladder (successes still return early; ladder attempts stay validated by parse + bar cross-check):

```ts
  for (const thresholdFactor of MASK_THRESHOLDS) {
    const raw = whiteMask(img, region, thresholdFactor);
    for (const config of GLYPH_PIPELINE_CONFIGS) {
      // ...existing body unchanged...
    }
  }
  return null;
```

- [ ] **Step 4: Run** — `npx vitest run src/features/scan/hpText.test.ts` → PASS. NOTE: the shipped templates are still binary-encoded ('0'/'1' now mean levels 0 and 1), so `scripts/hp-accuracy.ts` recall will CRATER until Task 4 regenerates them — that is expected; do not tune anything yet.

- [ ] **Step 5: Typecheck + full suite** — `npx tsc --noEmit && npx vitest run src/features/scan scripts` (the accuracy core test asserts wrong === 0, which still holds).

- [ ] **Step 6: Commit** — `git commit -am "feat(scan): grayscale L1 glyph matching with ambiguity margin"`

---

### Task 4: Golden-driven dual-decoder template rebuild + tuning

**Files:**
- Modify: `scripts/build-hp-glyph-templates.ts` (add `--from-golden` mode)
- Regenerate: `src/features/scan/hpGlyphTemplates.ts`, `training/hp-glyph-templates.json`

**Interfaces:**
- Consumes: `hp-golden.json`, `battleView`/`loadPng` from `hp-accuracy-core`, the builder's existing `glyphTemplatesFromPanel(img, panel, expectedText)` (which now emits level-encoded bits automatically, since it goes through `normalizeGlyph`).
- Produces: regenerated `HP_GLYPH_TEMPLATES` covering all of `0123456789/%` from BOTH pixel sources.

- [ ] **Step 1: Add the mode.** In `build-hp-glyph-templates.ts`, when `process.argv[2] === '--from-golden'`:

```ts
import { battleView, loadPng, type GoldenFile } from './hp-accuracy-core';

function buildFromGolden(): void {
  const golden: GoldenFile = JSON.parse(fs.readFileSync(path.resolve('training/hp-golden.json'), 'utf8'));
  const sources = [path.resolve('training/screenshots'), path.resolve('training/hp-fixtures')]
    .filter((d) => fs.existsSync(d));
  const templates: GlyphTemplate[] = []; // full rebuild, not merge
  let built = 0;
  let skipped = 0;
  for (const dir of sources) {
    for (const [name, entry] of Object.entries(golden)) {
      const file = path.join(dir, name);
      if (!fs.existsSync(file)) continue;
      const img = battleView(loadPng(file));
      for (const side of ['opponent', 'player'] as const) {
        const panels = detectBattlePanels(img, side);
        entry[side].forEach((expected, i) => {
          if (expected == null || !panels[i]) return;
          try {
            for (const t of glyphTemplatesFromPanel(img, panels[i], expected)) {
              if (!templates.some((e) => e.char === t.char && e.bits === t.bits)) templates.push(t);
            }
            built++;
          } catch (e) {
            skipped++;
            console.log(`  skip ${name} ${side}[${i}] "${expected}": ${(e as Error).message}`);
          }
        });
      }
    }
  }
  writeTemplates(templates); // the existing JSON+TS writer, extracted if needed
  const chars = [...new Set(templates.map((t) => t.char))].sort().join('');
  console.log(`Built from ${built} plate(s), skipped ${skipped}; ${templates.length} templates covering: ${chars}`);
}
```

(Adapt to the file's existing structure — `detectBattlePanels` is already imported there; extract the current JSON+TS write block into `writeTemplates(templates)` if it isn't already a function. The manual per-screenshot mode stays.)

- [ ] **Step 2: Rebuild** — `npx tsx scripts/build-hp-glyph-templates.ts --from-golden`. Expected: coverage line includes ALL of `%/0123456789` (the `4` arrives via 20-29-11 "149/185"). If a char is missing, a build plate was skipped — read the skip lines and fix (usually a golden array mismatch).

- [ ] **Step 3: Measure both runtimes** —

```bash
npx tsx scripts/hp-accuracy.ts            # expect a large recall jump, wrong 0
npx tsx scripts/hp-accuracy.ts --browser  # expect similar recall, wrong 0 (1%->7% gone)
```

- [ ] **Step 4: Tune `MAX_DIST` / `MIN_MARGIN`** — if recall < 80% or wrong > 0 in either runtime: raise/lower `MAX_DIST` (looser admits more reads) and `MIN_MARGIN` (larger kills ambiguous reads) in `hpText.ts`, re-run both sweeps. Optimize recall subject to wrong = 0 in BOTH. Iterate here — this is the measured loop the harness exists for. If recall plateaus far below target, inspect the top misses via `scripts/read-hp.ts <shot>` before touching thresholds further.

- [ ] **Step 5: Full suite** — `npx tsc --noEmit && npx vitest run src/features/scan scripts` → PASS.

- [ ] **Step 6: Commit** — `git add -A scripts src/features/scan/hpGlyphTemplates.ts training/hp-glyph-templates.json src/features/scan/hpText.ts && git commit -m "feat(scan): dual-decoder golden template rebuild + tuned thresholds"` (include hpText.ts only if tuning changed constants).

---

### Task 5: Regression floor + in-app verification

**Files:**
- Create: `scripts/hp-accuracy.test.ts`

**Interfaces:**
- Consumes: `sweep`, `loadPng` from Task 1; fixtures from Task 2 (optional at test time).

- [ ] **Step 1: Write the floor test:**

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { sweep, loadPng, type GoldenFile } from './hp-accuracy-core';

// Raise the floor as accuracy improves; never lower it to make a change pass.
const RECALL_FLOOR = 0.8;

const golden: GoldenFile = JSON.parse(fs.readFileSync('training/hp-golden.json', 'utf8'));
const run = (dir: string) => sweep(golden, (n) => loadPng(path.join(dir, n)));

describe('HP reader golden floor', () => {
  it('node pixels: zero wrong reads, recall above floor', () => {
    const s = run('training/screenshots');
    expect(s.wrong).toBe(0);
    expect(s.read / s.readable).toBeGreaterThanOrEqual(RECALL_FLOOR);
  }, 300_000);

  it.skipIf(!fs.existsSync('training/hp-fixtures'))('browser pixels: zero wrong reads, recall above floor', () => {
    const s = run('training/hp-fixtures');
    expect(s.wrong).toBe(0);
    expect(s.read / s.readable).toBeGreaterThanOrEqual(RECALL_FLOOR);
  }, 300_000);
});
```

Set `RECALL_FLOOR` to the value actually achieved in Task 4 if it landed below 0.8 (and say so in the commit message) — the floor documents reality, the spec target stays the goal.

- [ ] **Step 2: Run** — `npx vitest run scripts/hp-accuracy.test.ts` → PASS in both projects (browser one skips if fixtures absent).

- [ ] **Step 3: In-app manual verification** — `npm run dev`, Damage Calculator → Scan opponent → `Xnip2026-07-01_19-38-20.png`: the two opponent entries must show HP badges `29% HP` and `1% HP` (drive with the existing Playwright snippet pattern from the Stage-3 verification if preferred).

- [ ] **Step 4: Commit** — `git add scripts/hp-accuracy.test.ts && git commit -m "test(scan): golden recall floor for the HP reader"`
