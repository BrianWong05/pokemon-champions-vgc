import type { RgbaImage, TileBox } from './types';
import { whiteMask, type BinMask } from './hpText';

export interface TextShape { cols: number[]; grid: number[]; aspect: number }
export type TextRenderer = (text: string) => BinMask;
export interface TextCandidate { key: string; label: string }
export interface TextMatchResult { key: string; score: number }

const COLS = 48, GRID_W = 16, GRID_H = 6;
const MIN_INK = 12; // fewer lit pixels than this = blank region
const ICON_GAP = 8; // item/move crops prefix an icon; a column gap this wide separates icon from text

// Finds a leading blob of ink separated from the rest by a zero-run at
// least `minGap` wide, and returns where it ends (0 if there is none). A
// single line of glyph text is one contiguous ink band with no internal
// all-zero gap, so any such leading blob is foreign to the text (an icon or
// a UI divider bleeding into the crop) and should be excluded from the shape.
//
// An icon's own silhouette can fragment into several sub-blobs separated by
// small gaps below `minGap` (e.g. a round icon's outline vs. its lighter
// fill crossing whiteMask's threshold unevenly) — those sub-blobs are all
// still "icon", so a small gap between them must not end the scan early;
// keep merging blobs across sub-`minGap` gaps into the same leading region.
// A qualifying (>= minGap) gap doesn't necessarily mark the final boundary
// either — e.g. a rule-line row plus a separate small noise blob are each
// their own qualifying-gap blob before the real text starts — so keep
// advancing `cut` past every further blob that is itself followed by a
// qualifying gap, and only stop once a blob runs to the end of the array
// (nothing left to strip) or is followed by a sub-`minGap` gap (that gap
// is an ordinary inter-letter gap, i.e. we've reached the real text).
function stripLeadingBlob(counts: number[], minGap: number): number {
  let i = 0;
  let cut = 0;
  while (i < counts.length) {
    while (i < counts.length && counts[i] === 0) i++; // skip leading/gap zeros
    const blobStart = i;
    while (i < counts.length && counts[i] > 0) i++;
    if (blobStart >= counts.length) break;
    let gapEnd = i;
    while (gapEnd < counts.length && counts[gapEnd] === 0) gapEnd++;
    if (gapEnd >= counts.length) break; // blob runs to the end: nothing left to strip
    if (gapEnd - i >= minGap) {
      cut = gapEnd; // this blob (+ trailing gap) is not text; keep looking for more
      i = gapEnd;
    } else {
      i = gapEnd; // small gap: still inside the leading region, merge and keep scanning
    }
  }
  return cut;
}

// The first move-slot crop box sits with its top edge on the divider between
// the item row and the move list, so its mask can carry lit rows that aren't
// part of any glyph. They always sit above the text band with a full-zero
// row gap between them (the text band itself never has one) — zero them out.
export function stripRuleLines(mask: BinMask): BinMask {
  const rowInk = new Array(mask.h).fill(0);
  for (let y = 0; y < mask.h; y++) for (let x = 0; x < mask.w; x++) {
    if (mask.bits[y * mask.w + x]) rowInk[y]++;
  }
  const cut = stripLeadingBlob(rowInk, 1);
  if (cut === 0) return mask;
  const bits = mask.bits.slice();
  bits.fill(0, 0, cut * mask.w);
  return { bits, w: mask.w, h: mask.h };
}

// Item and move-slot crops include a leading type/item icon before the name
// text. Its column-ink blob is always separated from the text by a wide gap
// (observed 13-23 cols on real captures) — much wider than any inter-letter
// gap within text (observed 1-4 cols). Strip columns at/before the last such
// wide gap so the shape reflects only the text.
export function stripLeadingIcon(mask: BinMask): number {
  const colInk = new Array(mask.w).fill(0);
  for (let y = 0; y < mask.h; y++) for (let x = 0; x < mask.w; x++) {
    if (mask.bits[y * mask.w + x]) colInk[x]++;
  }
  return stripLeadingBlob(colInk, ICON_GAP);
}

export function inkBounds(mask: BinMask, startX = 0): TileBox | null {
  let minX = mask.w, minY = mask.h, maxX = -1, maxY = -1, ink = 0;
  for (let y = 0; y < mask.h; y++) for (let x = startX; x < mask.w; x++) {
    if (!mask.bits[y * mask.w + x]) continue;
    ink++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (ink < MIN_INK || maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// stripIcon defaults to true for real screenshot crops (textShapeAt below). A
// rendered candidate label (matchTextShape's render(c.label)) is pure text with
// no icon ever prepended, so the same gap heuristic there just misreads a
// short CJK word's own wide inter-glyph spacing as an "icon gap" and chews off
// real characters (measured: 421/6596 real vocab labels across ja/zh-Hant/
// zh-Hans corrupted this way, 0/1649 in en) — callers rendering a candidate
// label must pass stripIcon=false.
export function shapeFromMask(rawMask: BinMask, stripIcon = true): TextShape | null {
  const mask = stripRuleLines(rawMask);
  const cut = stripIcon ? stripLeadingIcon(mask) : 0;
  const b = inkBounds(mask, cut);
  if (!b || b.h < 4 || b.w < 4) return null;
  const cols = new Array(COLS).fill(0);
  const grid = new Array(GRID_W * GRID_H).fill(0);
  const colCount = new Array(COLS).fill(0);
  const gridCount = new Array(GRID_W * GRID_H).fill(0);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const lit = mask.bits[(b.y + y) * mask.w + (b.x + x)] ? 1 : 0;
    const c = Math.min(COLS - 1, Math.floor((x / b.w) * COLS));
    cols[c] += lit; colCount[c]++;
    const g = Math.min(GRID_H - 1, Math.floor((y / b.h) * GRID_H)) * GRID_W +
              Math.min(GRID_W - 1, Math.floor((x / b.w) * GRID_W));
    grid[g] += lit; gridCount[g]++;
  }
  return {
    cols: cols.map((v, i) => (colCount[i] ? v / colCount[i] : 0)),
    grid: grid.map((v, i) => (gridCount[i] ? v / gridCount[i] : 0)),
    aspect: b.w / b.h,
  };
}

function meanAbs(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

export function shapeDistance(a: TextShape, b: TextShape): number {
  return 0.49 * meanAbs(a.cols, b.cols)
       + 0.38 * meanAbs(a.grid, b.grid)
       + 0.13 * Math.min(1, Math.abs(a.aspect - b.aspect) / 6);
}

export function textShapeAt(img: RgbaImage, box: TileBox): TextShape | null {
  return shapeFromMask(whiteMask(img, box, 0.72)); // CALIBRATE threshold
}

// Avenir Next 700 adopted 2026-07-07 after a 15-font sweep (see
// task-7-report.md "Font sweep"): 35/36 full-vocab EN top-1 accuracy vs
// 33/36 baseline (system-ui 600), no CJK regression. Explicit CJK
// fallbacks since Avenir Next itself doesn't cover CJK glyphs.
const FONT = '700 32px "Avenir Next", "PingFang TC", "Hiragino Sans", sans-serif'; // both renderers use the same spec

export function makeTextRenderer(createCanvas: (w: number, h: number) => any): TextRenderer {
  const cache = new Map<string, BinMask>();
  return (text: string) => {
    const hit = cache.get(text);
    if (hit) return hit;
    const measure = createCanvas(10, 10).getContext('2d');
    measure.font = FONT;
    const w = Math.max(8, Math.ceil(measure.measureText(text).width) + 8);
    const h = 48;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.font = FONT; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 4, h / 2);
    const data = ctx.getImageData(0, 0, w, h).data;
    const bits = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) bits[p] = data[i] > 128 ? 1 : 0;
    const mask = { bits, w, h };
    cache.set(text, mask);
    return mask;
  };
}

export const browserTextRenderer: TextRenderer =
  makeTextRenderer((w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }));

export function matchTextShape(
  shape: TextShape, candidates: TextCandidate[], render: TextRenderer, topN = 3,
): TextMatchResult[] {
  const scored: TextMatchResult[] = [];
  for (const c of candidates) {
    const cs = shapeFromMask(render(c.label), false);
    if (!cs) continue;
    scored.push({ key: c.key, score: 1 - shapeDistance(shape, cs) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}

// ---------------------------------------------------------------------------
// Glyph atlas: per-character templates extracted from labeled screenshots
// (scripts/build-text-glyph-atlas.ts), so candidates can be composed in the
// GAME's own font instead of a canvas system font. Same-font comparisons put
// correct candidates near score 1.0, above the font-mismatch noise floor that
// causes confusable-pair losses (and above any platform font variation).

/** Serialized glyph: bits row-major, hex-packed 4 per digit, MSB first.
 *  Geometry is normalized to a 32px text line (ATLAS_LINE_H); yOff is the
 *  glyph's top offset from the line top at that scale. */
export interface AtlasGlyphData { char: string; w: number; h: number; yOff: number; hex: string }

export interface TextAtlas {
  glyphs: Map<string, { w: number; h: number; yOff: number; bits: Uint8Array }>;
  /** Inter-character advance gap in px at ATLAS_LINE_H scale. */
  gap: number;
  /** Per-label composed-shape cache (compose + shapeFromMask is pure). */
  shapes: Map<string, TextShape | null>;
}

export const ATLAS_LINE_H = 32;
// Accept the atlas ranking only when its best score clears this. Composed
// same-font matches on golden crops score >=0.93; the best wrong-language /
// wrong-candidate scores stay below (calibrated in Task 3 against the
// builder's validation report).
export const ATLAS_ACCEPT = 0.9;

function hexToBits(hex: string, n: number): Uint8Array {
  const bits = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const nib = parseInt(hex[i >> 2], 16);
    bits[i] = (nib >> (3 - (i & 3))) & 1;
  }
  return bits;
}

export function parseAtlas(entries: AtlasGlyphData[], gap: number): TextAtlas {
  const glyphs = new Map(entries.map(e => [
    e.char, { w: e.w, h: e.h, yOff: e.yOff, bits: hexToBits(e.hex, e.w * e.h) },
  ]));
  return { glyphs, gap, shapes: new Map() };
}

export function composeAtlasMask(atlas: TextAtlas, label: string): BinMask | null {
  const glyphs = [];
  for (const ch of [...label]) {
    const g = atlas.glyphs.get(ch);
    if (!g) return null;
    glyphs.push(g);
  }
  if (glyphs.length === 0) return null;
  const gap = Math.max(1, Math.round(atlas.gap));
  const margin = 2;
  const w = margin * 2 + glyphs.reduce((s, g) => s + g.w, 0) + gap * (glyphs.length - 1);
  const h = margin * 2 + Math.max(...glyphs.map(g => g.yOff + g.h));
  const bits = new Uint8Array(w * h);
  let x = margin;
  for (const g of glyphs) {
    for (let gy = 0; gy < g.h; gy++) for (let gx = 0; gx < g.w; gx++) {
      if (g.bits[gy * g.w + gx]) bits[(margin + g.yOff + gy) * w + (x + gx)] = 1;
    }
    x += g.w + gap;
  }
  return { bits, w, h };
}

function atlasShape(atlas: TextAtlas, label: string): TextShape | null {
  const cached = atlas.shapes.get(label);
  if (cached !== undefined) return cached;
  const mask = composeAtlasMask(atlas, label);
  const shape = mask ? shapeFromMask(mask, false) : null;
  atlas.shapes.set(label, shape);
  return shape;
}

/** Atlas-first matching: rank atlas-covered candidates against the crop shape;
 *  if the best clears ATLAS_ACCEPT that ranking wins, else fall back to canvas
 *  shape matching over the full candidate list. */
export function matchTextShapeHybrid(
  shape: TextShape, candidates: TextCandidate[], render: TextRenderer,
  atlas: TextAtlas | null, topN = 3,
): TextMatchResult[] {
  if (atlas) {
    const scored: TextMatchResult[] = [];
    for (const c of candidates) {
      const cs = atlasShape(atlas, c.label);
      if (!cs) continue;
      scored.push({ key: c.key, score: 1 - shapeDistance(shape, cs) });
    }
    scored.sort((a, b) => b.score - a.score);
    if ((scored[0]?.score ?? 0) >= ATLAS_ACCEPT) return scored.slice(0, topN);
  }
  return matchTextShape(shape, candidates, render, topN);
}
