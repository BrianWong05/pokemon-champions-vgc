// src/features/scan/hpText.ts
// Reads the fixed-font HP text under battle nameplates without a general OCR engine.
import { rgbToHsv } from './segmentation';
import { HP_GLYPH_TEMPLATES } from './hpGlyphTemplates';
import type { RgbaImage, TileBox } from './types';

export const GLYPH_SIZE = 16;

const MAX_HAMMING = 64;
// The bar-fill measure is crude (a full bar reads ~0.8) — the gate only
// rejects catastrophic glyph misreads like "00%" against a mostly-full bar.
const BAR_DISAGREE_PCT = 35;

export interface GlyphTemplate {
  char: string;
  bits: string;
  /** Glyph height relative to its text line — separates the small '%' parts
   *  from full-height digits (a '%' circle normalized to 16x16 looks like '0'). */
  hFrac: number;
}

export interface HpReading {
  percent: number;
  current?: number;
  max?: number;
}

export interface BinMask {
  bits: Uint8Array;
  w: number;
  h: number;
}

export function hpTextRegion(panel: TileBox, img: { width: number; height: number }): TileBox {
  // The HP text straddles the plate's bottom edge (the panel blob is the
  // magenta/purple plate only) — start mid-plate so the glyphs are whole. The
  // name text at the plate's top stays outside the region.
  const y = Math.min(img.height - 1, panel.y + Math.round(panel.h * 0.45));
  return {
    x: panel.x,
    y,
    w: Math.max(0, Math.min(panel.w, img.width - panel.x)),
    // Tight height: the timer / "MOVE TIME" white text sits further below and
    // must stay out of the region (a "20" cluster reads as a valid percent).
    h: Math.max(0, Math.min(Math.round(panel.h * 1.3), img.height - y)),
  };
}

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

  const threshold = Math.max(120, Math.round(peak * 0.8));
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = ((box.y + y) * img.width + (box.x + x)) * 4;
      if (Math.min(img.data[i], img.data[i + 1], img.data[i + 2]) >= threshold) bits[y * box.w + x] = 1;
    }
  }
  return { bits, w: box.w, h: box.h };
}

// The plate's thick white frame sweeps through the region and would bridge
// every glyph column into one run. Deleting whole components fails both ways
// (a fused digit dies with the frame; keeping the frame merges everything), so
// clean at pixel level instead:
//   1. erase LONG HORIZONTAL RUNS — frame lines span far more columns than any
//      digit stroke; erasing them also breaks frame-digit fusions;
//   2. then drop components still touching the left edge (the curved frame
//      remnant always crosses it; glyphs never do).
function cleanMask(mask: BinMask, runFactor: number): BinMask {
  const bits = Uint8Array.from(mask.bits);
  const maxRun = Math.max(6, Math.round(mask.h * runFactor));
  for (let y = 0; y < mask.h; y++) {
    let start = -1;
    for (let x = 0; x <= mask.w; x++) {
      const on = x < mask.w && bits[y * mask.w + x];
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        if (x - start > maxRun) for (let gx = start; gx < x; gx++) bits[y * mask.w + gx] = 0;
        start = -1;
      }
    }
  }

  const seen = new Uint8Array(bits.length);
  const stack: number[] = [];
  for (let p = 0; p < bits.length; p++) {
    if (!bits[p] || seen[p]) continue;
    const pixels: number[] = [];
    let touchesLeft = false;
    stack.push(p);
    seen[p] = 1;
    while (stack.length) {
      const q = stack.pop()!;
      pixels.push(q);
      const x = q % mask.w;
      if (x === 0) touchesLeft = true;
      if (x > 0 && bits[q - 1] && !seen[q - 1]) { seen[q - 1] = 1; stack.push(q - 1); }
      if (x < mask.w - 1 && bits[q + 1] && !seen[q + 1]) { seen[q + 1] = 1; stack.push(q + 1); }
      if (q - mask.w >= 0 && bits[q - mask.w] && !seen[q - mask.w]) { seen[q - mask.w] = 1; stack.push(q - mask.w); }
      if (q + mask.w < bits.length && bits[q + mask.w] && !seen[q + mask.w]) { seen[q + mask.w] = 1; stack.push(q + mask.w); }
    }
    if (touchesLeft) for (const q of pixels) bits[q] = 0;
  }
  return { bits, w: mask.w, h: mask.h };
}

// The HP font is italic: adjacent glyphs share x-columns, so straight column
// projection under-segments. Shearing rows left proportionally to their
// height deskews the text; the right factor is whichever separates the most
// glyphs (over-shearing cannot split a single glyph — every row stays
// contiguous, so a diagonal stroke still has no empty interior column).
function shearMask(mask: BinMask, k: number): BinMask {
  const shift = Math.ceil(k * mask.h);
  const w = mask.w + shift;
  const bits = new Uint8Array(w * mask.h);
  for (let y = 0; y < mask.h; y++) {
    const dx = Math.round(k * (mask.h - 1 - y));
    for (let x = 0; x < mask.w; x++) {
      if (mask.bits[y * mask.w + x]) bits[y * w + (x + shift - dx)] = 1;
    }
  }
  return { bits, w, h: mask.h };
}

export interface GlyphPipelineConfig {
  /** Italic deskew factor. */
  shear: number;
  /** Frame-line erasure: max horizontal run kept, as a fraction of region height. */
  runFactor: number;
}

// No single config covers every capture: glyph size relative to the region
// varies with resolution and panel-blob quality. Attempts are validated by the
// caller (expected glyph count at build time; parse + bar cross-check at
// runtime), so trying several configs is safe.
export const GLYPH_PIPELINE_CONFIGS: GlyphPipelineConfig[] = [
  { shear: 0.25, runFactor: 0.9 },
  { shear: 0.25, runFactor: 1.6 },
  { shear: 0.25, runFactor: 2.4 },
  { shear: 0.15, runFactor: 0.9 },
  { shear: 0.15, runFactor: 1.6 },
  { shear: 0.35, runFactor: 0.9 },
  { shear: 0.35, runFactor: 1.6 },
];

/**
 * Clean + deskew + segment with one pipeline config. Returns the processed
 * mask alongside the boxes — glyph boxes are in the PROCESSED mask's
 * coordinates, so normalizeGlyph must be called with that mask, not the raw one.
 */
export function extractGlyphs(
  rawMask: BinMask,
  config: GlyphPipelineConfig = GLYPH_PIPELINE_CONFIGS[0],
): { mask: BinMask; boxes: TileBox[] } {
  const mask = shearMask(cleanMask(rawMask, config.runFactor), config.shear);
  return { mask, boxes: splitWideBoxes(mask, projectColumns(mask)) };
}

// Antialiased italic digits can stay fused even after deskewing. A digit is
// ~0.62x as wide as tall, so an over-wide box is n fused glyphs — cut it at
// the sparsest column near each equal partition. '%' (near-square) gets
// over-split by this, which is recoverable: its unmatched pieces are re-merged
// by repairUnmatched at read time and by the N+1 ladder at build time.
function splitWideBoxes(mask: BinMask, boxes: TileBox[]): TileBox[] {
  const out: TileBox[] = [];
  for (const box of boxes) {
    const n = Math.max(1, Math.round(box.w / (box.h * 0.62)));
    if (n === 1) {
      out.push(box);
      continue;
    }
    const colCount: number[] = [];
    for (let x = box.x; x < box.x + box.w; x++) {
      let c = 0;
      for (let y = box.y; y < box.y + box.h; y++) if (mask.bits[y * mask.w + x]) c++;
      colCount.push(c);
    }
    const cuts = [0];
    const wiggle = Math.max(1, Math.round((box.w / n) * 0.3));
    for (let k = 1; k < n; k++) {
      const target = Math.round((k * box.w) / n);
      let best = target;
      let bestCount = Infinity;
      for (let x = Math.max(1, target - wiggle); x <= Math.min(box.w - 1, target + wiggle); x++) {
        if (colCount[x] < bestCount) {
          bestCount = colCount[x];
          best = x;
        }
      }
      cuts.push(best);
    }
    cuts.push(box.w);
    for (let k = 0; k + 1 < cuts.length; k++) {
      const w = cuts[k + 1] - cuts[k];
      if (w >= 1) out.push({ x: box.x + cuts[k], y: box.y, w, h: box.h });
    }
  }
  return out;
}

export function segmentGlyphs(rawMask: BinMask): TileBox[] {
  return projectColumns(cleanMask(rawMask, 0.9));
}

function projectColumns(mask: BinMask): TileBox[] {
  const colHas = new Array<boolean>(mask.w).fill(false);
  for (let x = 0; x < mask.w; x++) {
    for (let y = 0; y < mask.h; y++) {
      if (mask.bits[y * mask.w + x]) {
        colHas[x] = true;
        break;
      }
    }
  }

  const boxes: TileBox[] = [];
  let start = -1;
  for (let x = 0; x <= mask.w; x++) {
    const has = x < mask.w && colHas[x];
    if (has && start < 0) start = x;
    if (!has && start >= 0) {
      let y0 = mask.h;
      let y1 = -1;
      for (let y = 0; y < mask.h; y++) {
        for (let gx = start; gx < x; gx++) {
          if (mask.bits[y * mask.w + gx]) {
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
            break;
          }
        }
      }
      const box = { x: start, y: y0, w: x - start, h: y1 - y0 + 1 };
      if (box.h >= 5 && box.w >= 1) boxes.push(box);
      start = -1;
    }
  }
  return boxes;
}

// Drop noise blobs (orb reflections, plate-edge fragments) that are far
// shorter than the text line.
export function filterSpecks(boxes: TileBox[]): TileBox[] {
  if (boxes.length === 0) return boxes;
  const maxH = Math.max(...boxes.map((b) => b.h));
  return boxes.filter((b) => b.h >= maxH * 0.4 && b.w * b.h >= 4);
}

export function clusterGlyphBoxes(boxes: TileBox[]): TileBox[][] {
  if (boxes.length === 0) return [];
  // Gap threshold on line HEIGHT, not median width: one phrase mixes large
  // current-HP digits with the small /max digits, making widths bimodal.
  const lineH = Math.max(...boxes.map((b) => b.h));
  const clusters: TileBox[][] = [[boxes[0]]];
  for (let i = 1; i < boxes.length; i++) {
    const prev = boxes[i - 1];
    if (boxes[i].x - (prev.x + prev.w) > lineH * 1.2) clusters.push([]);
    clusters[clusters.length - 1].push(boxes[i]);
  }
  return clusters;
}

// Aspect-preserving (glyph centered on a square canvas) + area-averaged:
// point-sampling into a stretched 16x16 grid distorted tall digits enough to
// confuse '7' with '%' and '9' with '0' at small capture sizes.
export function normalizeGlyph(mask: BinMask, box: TileBox): Uint8Array {
  const side = Math.max(box.w, box.h);
  const ox = box.x - Math.floor((side - box.w) / 2);
  const oy = box.y - Math.floor((side - box.h) / 2);
  const out = new Uint8Array(GLYPH_SIZE * GLYPH_SIZE);
  const step = side / GLYPH_SIZE;
  for (let gy = 0; gy < GLYPH_SIZE; gy++) {
    for (let gx = 0; gx < GLYPH_SIZE; gx++) {
      let on = 0;
      let total = 0;
      for (let y = Math.floor(oy + gy * step); y < Math.ceil(oy + (gy + 1) * step); y++) {
        for (let x = Math.floor(ox + gx * step); x < Math.ceil(ox + (gx + 1) * step); x++) {
          total++;
          if (x >= 0 && y >= 0 && x < mask.w && y < mask.h && mask.bits[y * mask.w + x]) on++;
        }
      }
      out[gy * GLYPH_SIZE + gx] = total > 0 && on / total >= 0.4 ? 1 : 0;
    }
  }
  return out;
}

export function matchGlyph(
  bits: Uint8Array,
  hFrac: number,
  templates: GlyphTemplate[] = HP_GLYPH_TEMPLATES,
): string | null {
  let bestChar: string | null = null;
  let bestDist = Infinity;
  for (const template of templates) {
    if (template.bits.length !== bits.length) continue;
    if (Math.abs(template.hFrac - hFrac) > 0.25) continue;
    let dist = 0;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== template.bits.charCodeAt(i) - 48) dist++;
    }
    if (dist < bestDist) {
      bestDist = dist;
      bestChar = template.char;
    }
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
  // Find the bar row: the row with the longest saturated-fill run.
  let barY = -1;
  let bestRun = 0;
  for (let y = region.y; y < region.y + region.h; y++) {
    let run = 0;
    let maxRun = 0;
    for (let x = region.x; x < region.x + region.w; x++) {
      const i = (y * img.width + x) * 4;
      const [h, s, v] = rgbToHsv(img.data[i], img.data[i + 1], img.data[i + 2]);
      const filled = s > 0.45 && v > 0.35 && (h < 140 || h > 330);
      if (filled) {
        run++;
        if (run > maxRun) maxRun = run;
      } else {
        run = 0;
      }
    }
    if (maxRun > bestRun) {
      bestRun = maxRun;
      barY = y;
    }
  }
  if (barY < 0 || bestRun < panel.w * 0.08) return null;

  // Walk the track at that row: from the first filled pixel, the track
  // continues while pixels are filled or dark (the empty remainder); it ends
  // at the first sustained bright/colored non-fill (text, plate edge).
  const isFilled = (x: number) => {
    const i = (barY * img.width + x) * 4;
    const [h, s, v] = rgbToHsv(img.data[i], img.data[i + 1], img.data[i + 2]);
    return s > 0.45 && v > 0.35 && (h < 140 || h > 330);
  };
  const isTrack = (x: number) => {
    const i = (barY * img.width + x) * 4;
    const [, s, v] = rgbToHsv(img.data[i], img.data[i + 1], img.data[i + 2]);
    return v < 0.35 || (s < 0.3 && v < 0.55);
  };

  let x0 = region.x;
  while (x0 < region.x + region.w && !isFilled(x0)) x0++;
  if (x0 >= region.x + region.w) return null;

  let filled = 0;
  let track = 0;
  let miss = 0;
  for (let x = x0; x < region.x + region.w; x++) {
    if (isFilled(x)) {
      filled++;
      track++;
      miss = 0;
    } else if (isTrack(x)) {
      track++;
      miss = 0;
    } else if (++miss > 3) {
      break;
    } else {
      track++;
    }
  }
  track -= miss;
  if (track < panel.w * 0.2) return null;
  return Math.max(0, Math.min(1, filled / track));
}

function mergeBoxes(a: TileBox, b: TileBox): TileBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

// Multi-component glyphs ('%' = two circles + slash) can segment into several
// boxes none of which match alone — merge adjacent unmatched runs and rematch.
function repairUnmatched(
  items: Array<{ box: TileBox; char: string | null }>,
  mask: BinMask,
  lineH: number,
  templates: GlyphTemplate[],
): Array<{ box: TileBox; char: string | null }> {
  const out: Array<{ box: TileBox; char: string | null }> = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].char !== null) {
      out.push(items[i]);
      continue;
    }
    let box = items[i].box;
    let j = i;
    while (j + 1 < items.length && items[j + 1].char === null) {
      box = mergeBoxes(box, items[j + 1].box);
      j++;
    }
    out.push({ box, char: matchGlyph(normalizeGlyph(mask, box), box.h / lineH, templates) });
    i = j;
  }
  return out;
}

export function readHpFromPanel(
  img: RgbaImage,
  panel: TileBox,
  templates: GlyphTemplate[] = HP_GLYPH_TEMPLATES,
): HpReading | null {
  if (templates.length === 0) return null;
  const region = hpTextRegion(panel, img);
  if (region.h < 4 || region.w < 4) return null;

  const raw = whiteMask(img, region);
  for (const config of GLYPH_PIPELINE_CONFIGS) {
    const { mask, boxes } = extractGlyphs(raw, config);
    const clusters = clusterGlyphBoxes(filterSpecks(boxes));
    // The phrase can straddle cluster boundaries ("1" | "00%"), so try every
    // contiguous window of clusters, longest first — parse + bar validate.
    const windows: TileBox[][] = [];
    for (let i = 0; i < clusters.length; i++) {
      for (let j = clusters.length; j > i; j--) windows.push(clusters.slice(i, j).flat());
    }
    windows.sort((a, b) => b.length - a.length);
    for (const window of windows) {
      const lineH = Math.max(...window.map((b) => b.h));
      let items = window.map((box) => ({
        box,
        char: matchGlyph(normalizeGlyph(mask, box), box.h / lineH, templates),
      }));
      items = repairUnmatched(items, mask, lineH, templates);
      if (items.some((item) => item.char === null)) continue;
      const reading = parseHpText(items.map((item) => item.char).join(''));
      if (!reading) continue;
      // A live Pokemon is never at 0% — that's always a misread digit.
      if (reading.percent === 0) continue;

      const bar = measureHpBarFill(img, panel);
      if (bar != null && Math.abs(reading.percent - bar * 100) > BAR_DISAGREE_PCT) continue;
      // Short reads ("7%") are easily a stray digit + speck: only trust them
      // when the bar corroborates closely.
      if (items.length <= 2 && (bar == null || Math.abs(reading.percent - bar * 100) > 12)) continue;
      return reading;
    }
  }

  return null;
}
