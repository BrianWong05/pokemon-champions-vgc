/**
 * Build HP glyph templates from a battle screenshot with known HP text.
 *
 * Usage:
 *   npx tsx scripts/build-hp-glyph-templates.ts <screenshot.png> <side> <text-per-panel...>
 *   npx tsx scripts/build-hp-glyph-templates.ts training/screenshots/X.png opponent 100% 100%
 *   npx tsx scripts/build-hp-glyph-templates.ts training/screenshots/X.png player 157/157 177/177
 */
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import { detectBattlePanels, type BattleSide } from '../src/features/scan/battleDetection';
import {
  clusterGlyphBoxes,
  extractGlyphs,
  filterSpecks,
  GLYPH_PIPELINE_CONFIGS,
  hpTextRegion,
  normalizeGlyph,
  whiteMask,
  type GlyphTemplate,
} from '../src/features/scan/hpText';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

const JSON_PATH = path.resolve('training/hp-glyph-templates.json');
const TS_PATH = path.resolve('src/features/scan/hpGlyphTemplates.ts');

export function readPng(file: string): RgbaImage {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

function mergeBoxes(a: TileBox, b: TileBox): TileBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

// With the expected glyph count known, an under-segmented cluster can be
// repaired: keep bisecting the widest box at its sparsest column until the
// count matches.
function forceSplitToCount(mask: BinMask, boxes: TileBox[], n: number): TileBox[] | null {
  const out = [...boxes];
  while (out.length < n) {
    let idx = -1;
    for (let i = 0; i < out.length; i++) {
      if (out[i].w >= 6 && (idx < 0 || out[i].w > out[idx].w)) idx = i;
    }
    if (idx < 0) return null;
    const box = out[idx];
    let best = Math.round(box.w / 2);
    let bestCount = Infinity;
    for (let x = Math.round(box.w * 0.25); x <= Math.round(box.w * 0.75); x++) {
      let c = 0;
      for (let y = box.y; y < box.y + box.h; y++) if (mask.bits[y * mask.w + (box.x + x)]) c++;
      if (c < bestCount) {
        bestCount = c;
        best = x;
      }
    }
    out.splice(idx, 1,
      { x: box.x, y: box.y, w: best, h: box.h },
      { x: box.x + best, y: box.y, w: box.w - best, h: box.h });
  }
  return out;
}

function selectCluster(mask: BinMask, clusters: TileBox[][], expectedText: string): TileBox[] | null {
  const chars = [...expectedText];
  // Selection ladder: one exact cluster; all clusters concatenated (the '%'
  // often ends up in its own "cluster"); either shape with one extra box when
  // the trailing '%' split into two components; finally force-split an
  // under-segmented candidate up to the expected count.
  const all = clusters.flat().sort((a, b) => a.x - b.x);
  const candidates = [...clusters.filter((c) => c.length >= 2), all];
  const exact = candidates.find((c) => c.length === chars.length);
  if (exact) return exact;
  if (expectedText.endsWith('%')) {
    const oversized = candidates.find((c) => c.length === chars.length + 1);
    if (oversized) {
      return [...oversized.slice(0, -2), mergeBoxes(oversized[oversized.length - 2], oversized[oversized.length - 1])];
    }
  }
  for (const c of [...clusters, all]) {
    if (c.length >= chars.length) continue;
    const split = forceSplitToCount(mask, c, chars.length);
    if (split) return split;
  }
  return null;
}

export function glyphTemplatesFromPanel(img: RgbaImage, panel: TileBox, expectedText: string): GlyphTemplate[] {
  const raw = whiteMask(img, hpTextRegion(panel, img));
  const chars = [...expectedText];
  const shapes: string[] = [];

  for (const config of GLYPH_PIPELINE_CONFIGS) {
    const { mask, boxes } = extractGlyphs(raw, config);
    const clusters = clusterGlyphBoxes(filterSpecks(boxes))
      .sort((a, b) => b.length - a.length || totalWidth(b) - totalWidth(a));
    shapes.push(`[${clusters.map((c) => c.length).join(',')}]`);
    const cluster = selectCluster(mask, clusters, expectedText);
    if (!cluster) continue;

    const lineH = Math.max(...cluster.map((b) => b.h));
    return cluster.map((box, i) => ({
      char: chars[i],
      bits: Array.from(normalizeGlyph(mask, box)).join(''),
      hFrac: Number((box.h / lineH).toFixed(2)),
    }));
  }

  throw new Error(`Expected ${chars.length} glyphs ("${expectedText}") but configs saw ${shapes.join(' ')}`);
}

export function mergeTemplates(existing: GlyphTemplate[], additions: GlyphTemplate[]): GlyphTemplate[] {
  const merged = [...existing];
  for (const t of additions) {
    if (!merged.some((m) => m.char === t.char && m.bits === t.bits)) merged.push(t);
  }
  return merged;
}

export function writeTemplateFiles(templates: GlyphTemplate[], jsonPath = JSON_PATH, tsPath = TS_PATH): void {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(tsPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(templates, null, 1)}\n`);
  fs.writeFileSync(
    tsPath,
    `// src/features/scan/hpGlyphTemplates.ts
// GENERATED by scripts/build-hp-glyph-templates.ts. Do not edit by hand.
export const HP_GLYPH_TEMPLATES: Array<{ char: string; bits: string; hFrac: number }> = ${JSON.stringify(templates)};
`,
  );
}

export function buildTemplatesFromScreenshot(file: string, side: BattleSide, expected: string[]): GlyphTemplate[] {
  const img = readPng(file);
  const panels = detectBattlePanels(img, side);
  if (panels.length !== expected.length) {
    throw new Error(`Detected ${panels.length} ${side} panel(s) but got ${expected.length} expected string(s).`);
  }
  // "-" skips a panel (e.g. its region is polluted by the timer or subtitles).
  return panels.flatMap((panel, i) => (expected[i] === '-' ? [] : glyphTemplatesFromPanel(img, panel, expected[i])));
}

function totalWidth(boxes: TileBox[]): number {
  return boxes.reduce((sum, b) => sum + b.w, 0);
}

function readExistingTemplates(jsonPath = JSON_PATH): GlyphTemplate[] {
  return fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : [];
}

function main(argv: string[]): void {
  const [file, side, ...expected] = argv;
  if (!file || (side !== 'opponent' && side !== 'player') || expected.length === 0) {
    throw new Error('Usage: build-hp-glyph-templates.ts <screenshot.png> <opponent|player> <text-per-panel...>');
  }

  const existing = readExistingTemplates();
  const additions = buildTemplatesFromScreenshot(file, side, expected);
  const merged = mergeTemplates(existing, additions);
  writeTemplateFiles(merged);

  const added = merged.length - existing.length;
  const chars = [...new Set(merged.map((t) => t.char))].sort().join('');
  console.log(`Added ${added} template(s); ${merged.length} total covering: ${chars}`);
  console.log('Coverage needed: 0123456789/% - run again on more screenshots for missing chars.');
}

if (process.argv[1] && process.argv[1].endsWith('build-hp-glyph-templates.ts')) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
