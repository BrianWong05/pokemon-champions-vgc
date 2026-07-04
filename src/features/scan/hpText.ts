// src/features/scan/hpText.ts
// Reads the fixed-font HP text under battle nameplates without a general OCR engine.
import { rgbToHsv } from './segmentation';
import { HP_GLYPH_TEMPLATES } from './hpGlyphTemplates';
import type { RgbaImage, TileBox } from './types';

export const GLYPH_SIZE = 16;

const QUANT = 9;                 // coverage levels per cell: 0..9
const MAX_DIST = 0.1;            // per-glyph ceiling (matchGlyph; also caps decode candidates)
const MIN_MARGIN = 0.02;         // matchGlyph: best other-char distance must exceed the best by this
const MAX_PHRASE_DIST = 0.10;    // mean per-glyph cost ceiling for a decoded phrase
const PHRASE_MARGIN = 0.02;     // best value must beat the best DIFFERENT value by this
export const MASK_THRESHOLDS = [0.8, 0.72, 0.88];

// Fixed-font glyph shape bands (width/height, post-shear). Used by the
// template builder to refuse mis-split boxes and at read time to refuse
// readings whose glyph shapes are impossible (a fused '00' matching '0').
export const CHAR_ASPECT: Record<string, [number, number]> = {
  '1': [0.08, 0.75],
  '/': [0.08, 0.55],
  '%': [0.5, 2.0], // small captures merge the two circles + slash into one wide half-height box
};
export const DIGIT_ASPECT: [number, number] = [0.28, 0.95];

export function plausibleGlyphShape(char: string, box: TileBox): boolean {
  const [lo, hi] = CHAR_ASPECT[char] ?? DIGIT_ASPECT;
  const aspect = box.w / box.h;
  return aspect >= lo && aspect <= hi;
}
// Band-coherent bar detection reads within ~6 points when present (worst
// legitimate observed gap: 19) — 25 rejects wrong values like 60% against a
// full bar while clearing honest reads.
const BAR_DISAGREE_PCT = 25;

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

export function hpTextRegion(
  panel: TileBox,
  img: { width: number; height: number },
  heightFactor = 1.3,
): TileBox {
  // The HP text straddles the plate's bottom edge (the panel blob is the
  // magenta/purple plate only) — start mid-plate so the glyphs are whole. The
  // name text at the plate's top stays outside the region.
  const y = Math.min(img.height - 1, panel.y + Math.round(panel.h * 0.45));
  return {
    x: panel.x,
    y,
    w: Math.max(0, Math.min(panel.w, img.width - panel.x)),
    // Tight default height: the timer / "MOVE TIME" white text sits further
    // below and should stay out. When the panel blob is only the plate's top
    // band (compressed captures), callers retry with a taller factor.
    h: Math.max(0, Math.min(Math.round(panel.h * heightFactor), img.height - y)),
  };
}

// First the tight region; then a tall variant for captures where the color
// blob is only the plate's top band and the HP text sits deeper. The tall
// pass sees more junk (timer, subtitles) — the decode's validity, margin and
// bar guards carry the never-wrong burden there.
export const REGION_HEIGHT_FACTORS = [1.3, 2.6];

export function whiteMask(img: RgbaImage, box: TileBox, thresholdFactor = 0.8): BinMask {
  const bits = new Uint8Array(box.w * box.h);
  let peak = 0;
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = ((box.y + y) * img.width + (box.x + x)) * 4;
      const m = Math.min(img.data[i], img.data[i + 1], img.data[i + 2]);
      if (m > peak) peak = m;
    }
  }

  const threshold = Math.max(120, Math.round(peak * thresholdFactor));
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
  const projected = projectColumns(mask).map((box) => trimBoxVertically(mask, box));
  return { mask, boxes: splitWideBoxes(mask, projected).map((box) => trimBoxVertically(mask, box)) };
}

function trimBoxVertically(mask: BinMask, box: TileBox): TileBox {
  const rowInk: number[] = [];
  let peak = 0;
  let peakRow = 0;
  for (let y = box.y; y < box.y + box.h; y++) {
    let c = 0;
    for (let x = box.x; x < box.x + box.w; x++) {
      if (x >= 0 && y >= 0 && x < mask.w && y < mask.h && mask.bits[y * mask.w + x]) c++;
    }
    if (c > peak) {
      peak = c;
      peakRow = rowInk.length;
    }
    rowInk.push(c);
  }
  if (peak === 0) return box;
  let first = peakRow;
  let last = peakRow;
  while (first > 0 && rowInk[first - 1] >= 1) first--;
  while (last < rowInk.length - 1 && rowInk[last + 1] >= 1) last++;
  return { x: box.x, y: box.y + first, w: box.w, h: last - first + 1 };
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
export function filterSpecks(boxes: TileBox[], maskH?: number): TileBox[] {
  if (boxes.length === 0) return boxes;
  void maskH; // reserved: giant-blob filtering regressed low-res plates (their digits span most of the region)
  const maxH = Math.max(...boxes.map((b) => b.h));
  // Two legitimate text sizes share a line: current-HP digits (~1.0 lineH)
  // and the small /max digits (~0.45) — the cutoff must sit below the small size.
  return boxes.filter((b) => b.h >= maxH * 0.3 && b.w * b.h >= 4);
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
      out[gy * GLYPH_SIZE + gx] = total > 0 ? Math.min(QUANT, Math.floor((on / total) * (QUANT + 1))) : 0;
    }
  }
  return out;
}

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
      if (bestChar !== null && template.char !== bestChar) bestOther = bestDist;
      bestChar = template.char;
      bestDist = dist;
    } else if (template.char !== bestChar && dist < bestOther) {
      bestOther = dist;
    }
  }
  if (bestChar === null || bestDist > MAX_DIST) return null;
  // Ambiguity margin (e.g. 1 vs 7 at small sizes): prefer blank over a guess.
  if (bestOther - bestDist < MIN_MARGIN) return null;
  return bestChar;
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
  // Same short-blob problem as the text region: when the detected panel is
  // only the plate's top band, the bar sits deeper than a fixed window. Try
  // tight first, then tall.
  for (const heightFactor of [1.6, 3.2]) {
    const fill = measureHpBarFillIn(img, panel, heightFactor);
    if (fill != null) return fill;
  }
  return null;
}

function measureHpBarFillIn(img: RgbaImage, panel: TileBox, heightFactor: number): number | null {
  // The bar's own search window: taller than the text region (the bar can sit
  // right at the plate's bottom edge, above where the HP text starts).
  const y0 = Math.min(img.height - 1, panel.y + Math.round(panel.h * 0.2));
  const region = {
    x: panel.x,
    y: y0,
    w: Math.max(0, Math.min(panel.w, img.width - panel.x)),
    h: Math.max(0, Math.min(Math.round(panel.h * heightFactor), img.height - y0)),
  };
  // Fill colors: green/yellow/orange (h<140) or TRUE red (h>=350) — the gate
  // must exclude the magenta plate (h~325-345), which otherwise wins rows.
  const fillAt = (x: number, y: number) => {
    const i = (y * img.width + x) * 4;
    const [h, s, v] = rgbToHsv(img.data[i], img.data[i + 1], img.data[i + 2]);
    return s > 0.45 && v > 0.35 && (h < 140 || h >= 350);
  };

  // Per-row longest fill run + where it starts.
  const rows: Array<{ y: number; run: number; start: number }> = [];
  for (let y = region.y; y < region.y + region.h; y++) {
    let run = 0;
    let maxRun = 0;
    let start = -1;
    let curStart = -1;
    for (let x = region.x; x < region.x + region.w; x++) {
      if (fillAt(x, y)) {
        if (run === 0) curStart = x;
        run++;
        if (run > maxRun) {
          maxRun = run;
          start = curStart;
        }
      } else {
        run = 0;
      }
    }
    rows.push({ y, run: maxRun, start });
  }

  // The bar is a BAND: several adjacent rows with similar, aligned runs. Fire
  // and crowd effects have long runs too, but blobby — lengths and starts jump
  // row to row. Pick the longest-run row that has band support.
  const aligned = (a: { run: number; start: number }, b: { run: number; start: number }) =>
    b.run >= a.run * 0.7 && Math.abs(b.start - a.start) < Math.max(6, panel.w * 0.06);
  const minBarY = panel.y + panel.h * 0.6;
  let barY = -1;
  let bestRun = 0;
  for (let k = 1; k < rows.length - 1; k++) {
    const r = rows[k];
    if (r.y < minBarY) continue;
    if (r.run < panel.w * 0.08 || r.start < 0) continue;
    const support = [rows[k - 1], rows[k + 1]].filter((n) => n.start >= 0 && aligned(r, n)).length;
    if (support < 2) continue;
    if (r.run > bestRun) {
      bestRun = r.run;
      barY = r.y;
    }
  }
  if (barY < 0) return null;

  // Walk the track at that row: from the first filled pixel, the track
  // continues while pixels are filled or dark (the empty remainder); it ends
  // at the first sustained bright/colored non-fill (text, plate edge).
  const isFilled = (x: number) => fillAt(x, barY);
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


export interface GlyphCosts {
  box: TileBox;
  /** Best distance per character, shape- and hFrac-gated. */
  dists: Map<string, number>;
}

export function charDistances(
  bits: Uint8Array,
  hFrac: number,
  box: TileBox,
  templates: GlyphTemplate[] = HP_GLYPH_TEMPLATES,
): Map<string, number> {
  const dists = new Map<string, number>();
  const norm = bits.length * QUANT;
  for (const template of templates) {
    if (template.bits.length !== bits.length) continue;
    if (Math.abs(template.hFrac - hFrac) > 0.25) continue;
    if (!plausibleGlyphShape(template.char, box)) continue;
    let sum = 0;
    for (let i = 0; i < bits.length; i++) {
      sum += Math.abs(bits[i] - (template.bits.charCodeAt(i) - 48));
    }
    const dist = sum / norm;
    if (dist < (dists.get(template.char) ?? Infinity)) dists.set(template.char, dist);
  }
  return dists;
}

export interface PhraseCandidate {
  text: string;
  /** Canonical value key: "40%" or "81/202". */
  value: string;
  percent: number;
  current?: number;
  max?: number;
  /** Mean per-glyph distance. */
  cost: number;
}

// Joint decoding: instead of accepting each glyph independently, search the
// small product space of the top-2 characters per position for the cheapest
// text that is a VALID HP phrase. Phrase context settles ambiguous glyphs
// ("700%" is not a value, so a 7-vs-1 toss-up resolves to '1') and junk lines
// like the timer can never win (no valid phrase exists for them).
export function decodeWindow(glyphs: GlyphCosts[]): PhraseCandidate[] {
  const n = glyphs.length;
  if (n < 2 || n > 9) return [];
  const tops = glyphs.map((g) => [...g.dists.entries()].sort((a, b) => a[1] - b[1]).slice(0, 2));
  if (tops.some((t) => t.length === 0)) return [];

  const out: PhraseCandidate[] = [];
  for (let m = 0; m < (1 << n); m++) {
    let cost = 0;
    let text = '';
    let ok = true;
    for (let i = 0; i < n; i++) {
      const pick = tops[i][(m >> i) & 1];
      if (!pick || pick[1] > MAX_DIST) { ok = false; break; }
      text += pick[0];
      cost += pick[1];
    }
    if (!ok) continue;
    const reading = parseHpText(text);
    if (!reading || reading.percent === 0) continue;
    // Level-50 VGC max HP is never below ~110 (frailest legal mons ~130);
    // a low max is a fraction that LOST a digit ('30/170' -> '30/70').
    if (reading.max != null && (reading.max < 100 || reading.max > 500)) continue;
    out.push({
      text,
      value: reading.current != null ? `${reading.current}/${reading.max}` : `${reading.percent}%`,
      percent: reading.percent,
      current: reading.current,
      max: reading.max,
      cost: cost / n,
    });
  }
  return out;
}

// A '%' that split into pieces used to be repaired by re-merging unmatched
// boxes; under joint decoding the equivalent is offering window variants with
// the trailing boxes merged (percent phrases end in '%').
function tailMergeVariants(window: TileBox[]): TileBox[][] {
  const variants: TileBox[][] = [window];
  for (const take of [2, 3]) {
    if (window.length > take) {
      const merged = window.slice(-take).reduce(mergeBoxes);
      variants.push([...window.slice(0, -take), merged]);
    }
  }
  return variants;
}

export function readHpFromPanel(
  img: RgbaImage,
  panel: TileBox,
  templates: GlyphTemplate[] = HP_GLYPH_TEMPLATES,
  kind?: 'percent' | 'fraction',
): HpReading | null {
  if (templates.length === 0) return null;
  const bar = measureHpBarFill(img, panel);

  // Collect the cheapest candidate per distinct VALUE across every attempt
  // (region height x mask threshold x pipeline config x window x variant).
  const best = new Map<string, PhraseCandidate>();
  for (const heightFactor of REGION_HEIGHT_FACTORS) {
  const region = hpTextRegion(panel, img, heightFactor);
  if (region.h < 4 || region.w < 4) continue;
  for (const thresholdFactor of MASK_THRESHOLDS) {
    const raw = whiteMask(img, region, thresholdFactor);
    for (const config of GLYPH_PIPELINE_CONFIGS) {
      const { mask, boxes } = extractGlyphs(raw, config);
      const clusters = clusterGlyphBoxes(filterSpecks(boxes, mask.h));
      // The phrase can straddle cluster boundaries ("1" | "00%"), so try every
      // contiguous window of clusters.
      const windows: TileBox[][] = [];
      for (let i = 0; i < clusters.length; i++) {
        for (let j = clusters.length; j > i; j--) windows.push(clusters.slice(i, j).flat());
      }
      // Costs depend on the box AND the window's line height (hFrac gate).
      const costCache = new Map<string, GlyphCosts>();
      for (const window of windows) {
        for (const variant of tailMergeVariants(window)) {
          const lineH = Math.max(...variant.map((b) => b.h));
          const glyphs = variant.map((box) => {
            const key = `${box.x},${box.y},${box.w},${box.h}:${lineH}`;
            const cached = costCache.get(key);
            if (cached) return cached;
            const costs: GlyphCosts = { box, dists: charDistances(normalizeGlyph(mask, box), box.h / lineH, box, templates) };
            costCache.set(key, costs);
            return costs;
          });
          let cands = decodeWindow(glyphs);
          // A box whose shape fits no character invalidates the window (by
          // design) — but it is often a SPLIT piece of its neighbor. Offer
          // repaired variants with that box merged left/right (the decode-era
          // equivalent of the old repairUnmatched).
          if (cands.length === 0 && variant.length > 2) {
            const bad = glyphs.findIndex((g) => g.dists.size === 0);
            if (bad >= 0) {
              for (const j of [bad - 1, bad + 1]) {
                if (j < 0 || j >= variant.length) continue;
                const lo = Math.min(bad, j);
                const repaired = [...variant];
                repaired.splice(lo, 2, mergeBoxes(variant[lo], variant[lo + 1]));
                const lineH2 = Math.max(...repaired.map((b) => b.h));
                const glyphs2 = repaired.map((box) => ({
                  box,
                  dists: charDistances(normalizeGlyph(mask, box), box.h / lineH2, box, templates),
                }));
                cands = cands.concat(decodeWindow(glyphs2));
              }
            }
          }
          for (const cand of cands) {
            const prev = best.get(cand.value);
            if (!prev || cand.cost < prev.cost) best.set(cand.value, cand);
          }
        }
      }
    }
  }

  }
  let ranked = [...best.values()].sort((a, b) => a.cost - b.cost);
  // Opponent plates only ever show a percentage, player plates only a fraction
  // — a known side rejects the other format's junk decodes structurally.
  if (kind === 'percent') ranked = ranked.filter((c) => c.current == null);
  else if (kind === 'fraction') ranked = ranked.filter((c) => c.current != null);
  if (ranked.length === 0 || ranked[0].cost > MAX_PHRASE_DIST) return null;

  let chosen = ranked[0];
  const fullBarCandidate =
    bar != null && bar >= 0.9
      ? ranked.find((c) => c.current == null && c.percent === 100 && c.cost <= MAX_PHRASE_DIST)
      : undefined;
  // A contender must be close in ABSOLUTE terms and not dominated in RELATIVE
  // terms — an exact (near-zero-cost) match is not "ambiguous" merely because
  // some phrase costs 0.008.
  const contenders = ranked.filter(
    (c) => c.cost - ranked[0].cost < PHRASE_MARGIN && c.cost < ranked[0].cost * 3 + 0.005,
  );
  if (contenders.length > 1) {
    // Two different values are nearly as cheap — only the bar may arbitrate.
    const corroborated = contenders.filter((c) => bar != null && Math.abs(c.percent - bar * 100) <= 12);
    if (corroborated.length === 1) {
      chosen = corroborated[0];
    } else if (fullBarCandidate) {
      chosen = fullBarCandidate;
    } else {
      // Last resort before bailing: a window that drops a cleanly-segmented
      // LEADING glyph yields a phrase whose text is a suffix of the fuller read
      // ("3%" from "73%", "3/193" from "193/193"). When the fuller read is
      // equally cheap, the shorter one is a segmentation phantom, not a rival
      // value — prefer the fuller read (the downstream bar gate still guards it).
      const survivors = contenders.filter(
        (c) => !contenders.some((o) => o !== c && o.text.length > c.text.length && o.text.endsWith(c.text)),
      );
      if (survivors.length === 1) {
        chosen = survivors[0];
      } else {
        return null;
      }
    }
  } else if (
    fullBarCandidate &&
    chosen.current == null &&
    bar != null &&
    Math.abs(chosen.percent - bar * 100) > BAR_DISAGREE_PCT
  ) {
    chosen = fullBarCandidate;
  }

  // Every wrong read this system has produced was a PERCENT-ONLY value with
  // no measurable bar (junk decoding to a cheap valid phrase). Percent reads
  // therefore REQUIRE a corroborating bar; fractions carry internal
  // redundancy (two consistent numbers, max >= 100) and only get a loose
  // sanity gate — the bar itself mis-measures on subtitled plates.
  if (chosen.current == null) {
    // A known-opponent panel is ALWAYS a percent, so it no longer needs a bar to
    // prove it isn't a mis-segmented fraction; the bar only vetoes on disagreement.
    const barRequired = kind !== 'percent';
    if (bar == null) {
      if (barRequired) return null;
    } else {
      if (Math.abs(chosen.percent - bar * 100) > BAR_DISAGREE_PCT) return null;
      // Truncation shadows of 100% and bare short reads need the bar CLOSE.
      if (chosen.percent === 10 || chosen.percent === 1 || chosen.text.length <= 2) {
        if (Math.abs(chosen.percent - bar * 100) > 12) return null;
      }
    }
  } else if (bar != null && Math.abs(chosen.percent - bar * 100) > 35) {
    return null;
  }

  return chosen.current != null && chosen.max != null
    ? { percent: chosen.percent, current: chosen.current, max: chosen.max }
    : { percent: chosen.percent };
}
