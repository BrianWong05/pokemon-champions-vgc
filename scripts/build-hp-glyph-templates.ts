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
  plausibleGlyphShape,
  MASK_THRESHOLDS,
} from '../src/features/scan/hpText';
import type { RgbaImage, TileBox } from '../src/features/scan/types';
import { battleView, type GoldenFile } from './hp-accuracy-core';

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

export function glyphTemplatesFromPanel(
  img: RgbaImage,
  panel: TileBox,
  expectedText: string,
  thresholdFactor = 0.8,
): GlyphTemplate[] {
  const raw = whiteMask(img, hpTextRegion(panel, img), thresholdFactor);
  const chars = [...expectedText];
  const shapes: string[] = [];

  for (const config of GLYPH_PIPELINE_CONFIGS) {
    const { mask, boxes } = extractGlyphs(raw, config);
    const clusters = clusterGlyphBoxes(filterSpecks(boxes))
      .sort((a, b) => b.length - a.length || totalWidth(b) - totalWidth(a));
    shapes.push(`[${clusters.map((c) => c.length).join(',')}]`);
    const cluster = selectCluster(mask, clusters, expectedText);
    if (!cluster) continue;

    // Keep only glyphs whose box shape is plausible for their assigned char —
    // mis-split slivers must never become templates. If most of the plate is
    // implausible the assignment itself is suspect: try the next config.
    const lineH = Math.max(...cluster.map((b) => b.h));
    const kept = cluster
      .map((box, i) => ({ box, char: chars[i] }))
      .filter(({ box, char }) => plausibleGlyphShape(char, box));
    if (kept.length < chars.length * 0.7) continue;
    return kept.map(({ box, char }) => ({
      char,
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

// Rebuild the ENTIRE template set from every readable golden plate, in every
// available pixel source (pngjs screenshots + browser-decoded fixtures) — the
// two decoders differ on ~40% of bytes, and templates built from one
// systematically mismatch glyphs masked from the other.
export function buildFromGolden(): void {
  const golden: GoldenFile = JSON.parse(fs.readFileSync(path.resolve('training/hp-golden.json'), 'utf8'));
  const sources = [path.resolve('training/screenshots'), path.resolve('training/hp-fixtures')]
    .filter((d) => fs.existsSync(d));
  let templates: GlyphTemplate[] = [];
  let built = 0;
  let skipped = 0;
  for (const dir of sources) {
    for (const [name, entry] of Object.entries(golden)) {
      const file = path.join(dir, name);
      if (!fs.existsSync(file)) continue;
      const img = battleView(readPng(file));
      for (const side of ['opponent', 'player'] as const) {
        const panels = detectBattlePanels(img, side);
        entry[side].forEach((expected, i) => {
          if (expected == null || !panels[i]) return;
          // Build at every mask threshold the reader will try: glyph stroke
          // weight changes with the threshold, and templates from one weight
          // do not match masks produced at another.
          let ok = false;
          for (const thresholdFactor of MASK_THRESHOLDS) {
            try {
              templates = mergeTemplates(templates, glyphTemplatesFromPanel(img, panels[i], expected, thresholdFactor));
              ok = true;
            } catch {
              // a threshold variant failing is fine as long as one succeeds
            }
          }
          if (ok) built++;
          else {
            skipped++;
            console.log(`  skip ${path.basename(dir)}/${name} ${side}[${i}] "${expected}": no threshold variant segmented`);
          }
        });
      }
    }
  }
  const pruned = pruneConflicts(templates);
  writeTemplateFiles(pruned);
  const chars = [...new Set(pruned.map((t) => t.char))].sort().join('');
  console.log(`Built from ${built} plate(s) across ${sources.length} source(s), skipped ${skipped}.`);
  console.log(`${pruned.length} templates (${templates.length - pruned.length} conflicted pruned) covering: ${chars}`);
}

// Two templates of DIFFERENT chars at near-zero distance cannot both be
// right — one is a mis-assigned build sliver (force-split plates assign chars
// positionally). Keeping either would poison the read-time margin rule, so
// drop both: policy A prefers a blank over a guess.
export function pruneConflicts(templates: GlyphTemplate[], eps = 0.04): GlyphTemplate[] {
  const bad = new Set<number>();
  for (let i = 0; i < templates.length; i++) {
    for (let j = i + 1; j < templates.length; j++) {
      if (templates[i].char === templates[j].char) continue;
      if (templates[i].bits.length !== templates[j].bits.length) continue;
      if (Math.abs(templates[i].hFrac - templates[j].hFrac) > 0.25) continue; // never co-candidates
      let sum = 0;
      for (let k = 0; k < templates[i].bits.length; k++) {
        sum += Math.abs(templates[i].bits.charCodeAt(k) - templates[j].bits.charCodeAt(k));
      }
      if (sum / (templates[i].bits.length * 9) < eps) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return templates.filter((_, i) => !bad.has(i));
}

function main(argv: string[]): void {
  if (argv[0] === '--from-golden') {
    buildFromGolden();
    return;
  }
  const [file, side, ...expected] = argv;
  if (!file || (side !== 'opponent' && side !== 'player') || expected.length === 0) {
    throw new Error('Usage: build-hp-glyph-templates.ts [--from-golden] | <screenshot.png> <opponent|player> <text-per-panel...>');
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
