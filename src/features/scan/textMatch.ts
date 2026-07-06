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
    if (gapEnd - i >= minGap && gapEnd < counts.length) {
      cut = gapEnd; // this blob (+ trailing gap) is not text
    } else {
      break; // reached text: gap after this blob is a normal letter-gap (or end of mask)
    }
  }
  return cut;
}

// The first move-slot crop box sits with its top edge on the divider between
// the item row and the move list, so its mask can carry lit rows that aren't
// part of any glyph. They always sit above the text band with a full-zero
// row gap between them (the text band itself never has one) — zero them out.
function stripRuleLines(mask: BinMask): BinMask {
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
function stripLeadingIcon(mask: BinMask): number {
  const colInk = new Array(mask.w).fill(0);
  for (let y = 0; y < mask.h; y++) for (let x = 0; x < mask.w; x++) {
    if (mask.bits[y * mask.w + x]) colInk[x]++;
  }
  return stripLeadingBlob(colInk, ICON_GAP);
}

function inkBounds(mask: BinMask, startX = 0): TileBox | null {
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

const FONT = '600 32px system-ui, sans-serif'; // both renderers use the same spec

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
