import type { RgbaImage, TileBox } from './types';
import { whiteMask, normalizeGlyph, QUANT, type BinMask } from './hpText';

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

// Move-slot crop boxes can catch lit rows that aren't part of any glyph: the
// first row's top edge sits on the item/move divider, and the LAST row's
// bottom edge sits on the panel frame (whose remnant pixels once made this
// function treat the text itself as a "leading blob" and strip it — the
// ja-rental-r676 slot-1 move-4 no-shape bug). Junk blobs are always separated
// from the text band by a full-zero row gap (the band itself never has one)
// and are 1-3 rows tall vs the band's full glyph height — so keep only the
// TALLEST row-blob (ties: most ink) and zero every row outside it.
export function stripRuleLines(mask: BinMask): BinMask {
  const rowInk = new Array(mask.h).fill(0);
  for (let y = 0; y < mask.h; y++) for (let x = 0; x < mask.w; x++) {
    if (mask.bits[y * mask.w + x]) rowInk[y]++;
  }
  let best: { y0: number; y1: number; ink: number } | null = null;
  let y = 0;
  while (y < mask.h) {
    while (y < mask.h && rowInk[y] === 0) y++;
    const y0 = y;
    let ink = 0;
    while (y < mask.h && rowInk[y] > 0) ink += rowInk[y++];
    if (y0 >= mask.h) break;
    const better = !best || (y - y0) > (best.y1 - best.y0) ||
      ((y - y0) === (best.y1 - best.y0) && ink > best.ink);
    if (better) best = { y0, y1: y, ink };
  }
  if (!best || (best.y0 === 0 && best.y1 === mask.h)) return mask;
  const bits = mask.bits.slice();
  bits.fill(0, 0, best.y0 * mask.w);
  bits.fill(0, best.y1 * mask.w);
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
  /** Character cell pitch in px at ATLAS_LINE_H scale. The game font renders
   *  CJK/kana monospaced (measured: even small kana and ー advance a full
   *  cell), so composition places each glyph centered in consecutive
   *  pitch-wide cells rather than packing by ink width. */
  pitch: number;
  /** Lazy 16x16 quantized form of each glyph, for cell-distance matching. */
  quant?: Map<string, { q: Uint8Array; hFrac: number }>;
}

export const ATLAS_LINE_H = 32;
// Accept the atlas ranking only when its best score (1 - mean per-cell glyph
// distance) clears this. Calibrated on the golden validation report
// (scripts/build-text-glyph-atlas.ts, 2026-07-07): the crops the canvas pass
// gets WRONG all decode at 0.82-0.92 (must accept); the highest wrong-key
// score any crop produces against any language's candidates is 0.7146 (must
// reject); the only golden crop between those bands is a compression-softened
// one at 0.7138 whose canvas fallback reads correctly anyway. Known
// limitation: a candidate whose true label contains an atlas-uncovered char
// can't be ranked, and a covered confusable sibling could then top at up to
// ~0.84 — coverage grows with each labeled golden, shrinking that window.
export const ATLAS_ACCEPT = 0.78;
// A cell's height relative to its line must roughly agree with the
// template's height at build time (mirrors hpText matchGlyph's hFrac gate).
const HFRAC_TOL = 0.3;

function hexToBits(hex: string, n: number): Uint8Array {
  const bits = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const nib = parseInt(hex[i >> 2], 16);
    bits[i] = (nib >> (3 - (i & 3))) & 1;
  }
  return bits;
}

export function parseAtlas(entries: AtlasGlyphData[], pitch: number): TextAtlas {
  const glyphs = new Map(entries.map(e => [
    e.char, { w: e.w, h: e.h, yOff: e.yOff, bits: hexToBits(e.hex, e.w * e.h) },
  ]));
  return { glyphs, pitch };
}

function atlasQuant(atlas: TextAtlas): NonNullable<TextAtlas['quant']> {
  if (!atlas.quant) {
    atlas.quant = new Map();
    for (const [ch, g] of atlas.glyphs) {
      atlas.quant.set(ch, {
        q: normalizeGlyph({ bits: g.bits, w: g.w, h: g.h }, { x: 0, y: 0, w: g.w, h: g.h }),
        hFrac: g.h / ATLAS_LINE_H,
      });
    }
  }
  return atlas.quant;
}

export function composeAtlasMask(atlas: TextAtlas, label: string): BinMask | null {
  const glyphs = [];
  for (const ch of [...label]) {
    const g = atlas.glyphs.get(ch);
    if (!g) return null;
    glyphs.push(g);
  }
  if (glyphs.length === 0) return null;
  const pitch = Math.max(1, Math.round(atlas.pitch));
  const margin = 2;
  const w = margin * 2 + pitch * glyphs.length;
  const h = margin * 2 + Math.max(...glyphs.map(g => g.yOff + g.h));
  const bits = new Uint8Array(w * h);
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const x = margin + i * pitch + Math.max(0, Math.round((pitch - g.w) / 2));
    for (let gy = 0; gy < g.h; gy++) for (let gx = 0; gx < g.w; gx++) {
      if (g.bits[gy * g.w + gx] && x + gx < w) bits[(margin + g.yOff + gy) * w + (x + gx)] = 1;
    }
  }
  return { bits, w, h };
}

// --- crop-side cell segmentation ---------------------------------------------
// Matching composed atlas strips against the crop's 48-bin shape loses too
// much geometry (baseline, exact pitch): measured min correct top-1 score
// 0.71 vs max wrong top-1 0.90 — no accept threshold separates them. Instead
// decode the CROP into per-character cells and match each cell against atlas
// glyphs in normalizeGlyph's aspect-preserving 16x16 space, exactly like the
// HP/stat digit readers — per-cell distances give digit-reader-grade
// separation and are immune to composition-geometry error.

export interface CellBlob { x0: number; x1: number }

export function columnBlobs(mask: BinMask, b: TileBox): CellBlob[] {
  const blobs: CellBlob[] = [];
  let start = -1;
  for (let x = b.x; x <= b.x + b.w; x++) {
    let has = false;
    if (x < b.x + b.w) {
      for (let y = b.y; y < b.y + b.h; y++) {
        if (mask.bits[y * mask.w + x]) { has = true; break; }
      }
    }
    if (has && start < 0) start = x;
    if (!has && start >= 0) { blobs.push({ x0: start, x1: x - 1 }); start = -1; }
  }
  return blobs;
}

// Touching characters fuse into one column blob (observed: katakana pairs).
// While short of k blobs, split the widest blob — it must span ~2 pitches to
// be a fusion — at its sparsest interior column.
function splitFused(mask: BinMask, b: TileBox, blobs: CellBlob[], k: number): CellBlob[] | null {
  const out = blobs.slice();
  const pitch = (blobs[blobs.length - 1].x1 - blobs[0].x0 + 1) / k;
  while (out.length < k) {
    let wi = 0;
    for (let i = 1; i < out.length; i++) if (out[i].x1 - out[i].x0 > out[wi].x1 - out[wi].x0) wi = i;
    const blob = out[wi];
    const w = blob.x1 - blob.x0 + 1;
    if (w < pitch * 1.2) return null; // widest blob is a plausible single char: nothing fused
    const mid = blob.x0 + w / 2, wiggle = w * 0.3;
    let bestX = -1, bestCount = Infinity;
    for (let x = Math.ceil(mid - wiggle); x <= Math.floor(mid + wiggle); x++) {
      let c = 0;
      for (let y = b.y; y < b.y + b.h; y++) if (mask.bits[y * mask.w + x]) c++;
      if (c < bestCount) { bestCount = c; bestX = x; }
    }
    if (bestX <= blob.x0 || bestX >= blob.x1) return null;
    out.splice(wi, 1, { x0: blob.x0, x1: bestX - 1 }, { x0: bestX + 1, x1: blob.x1 });
  }
  return out;
}

// Partition blobs into k contiguous groups (one per character) minimizing
// Σ|group extent − pitch|. CJK/kana render on a near-uniform pitch, so the
// optimal partition puts multi-blob characters (順 = 川+頁 pieces, dakuten
// marks) back together even when their internal gaps rival inter-char gaps.
export function groupBlobs(blobs: CellBlob[], k: number): CellBlob[] | null {
  const n = blobs.length;
  if (k < 1 || n < k) return null;
  if (n === k) return blobs.slice();
  const pitch = (blobs[n - 1].x1 - blobs[0].x0 + 1) / k;
  const extent = (a: number, b: number) => blobs[b].x1 - blobs[a].x0 + 1;
  const dp = Array.from({ length: k }, () => new Array<number>(n).fill(Infinity));
  const back = Array.from({ length: k }, () => new Array<number>(n).fill(-1));
  for (let i = 0; i <= n - k; i++) dp[0][i] = Math.abs(extent(0, i) - pitch);
  for (let j = 1; j < k; j++) {
    for (let i = j; i < n; i++) {
      for (let p = j - 1; p < i; p++) {
        if (!isFinite(dp[j - 1][p])) continue;
        const c = dp[j - 1][p] + Math.abs(extent(p + 1, i) - pitch);
        if (c < dp[j][i]) { dp[j][i] = c; back[j][i] = p; }
      }
    }
  }
  if (!isFinite(dp[k - 1][n - 1])) return null;
  const groups: CellBlob[] = [];
  let i = n - 1;
  for (let j = k - 1; j >= 0; j--) {
    const p = j === 0 ? -1 : back[j][i];
    groups.unshift({ x0: blobs[p + 1].x0, x1: blobs[i].x1 });
    i = p;
  }
  return groups;
}

/** Blobs → fused-blob splitting → pitch-DP grouping into exactly k cells.
 *  Shared by the runtime decoder and the atlas builder. */
export function segmentCells(
  mask: BinMask, b: TileBox, k: number, blobs: CellBlob[] = columnBlobs(mask, b),
): CellBlob[] | null {
  let list: CellBlob[] | null = blobs;
  if (list.length < k) list = splitFused(mask, b, list, k);
  return list && groupBlobs(list, k);
}

/** For one candidate length k: per-cell char→distance maps, one entry per
 *  mask variant that segments into k cells (empty array = none do). A
 *  candidate's cost is its best variant — a crop degraded at one threshold
 *  (overlay bleed, antialiasing fusing strokes) often reads cleanly at
 *  another, exactly like the HP/stat readers' MASK_THRESHOLDS sweep. */
export type CellDecoder = (k: number) => Array<Array<Map<string, number>>>;

export function makeCellDecoder(rawMasks: BinMask | BinMask[], atlas: TextAtlas): CellDecoder {
  const variants = Array.isArray(rawMasks) ? rawMasks : [rawMasks];
  let prepared: Array<{ mask: BinMask; b: TileBox; blobs: CellBlob[] }> | undefined;
  const cache = new Map<number, Array<Array<Map<string, number>>>>();
  return (k: number) => {
    if (prepared === undefined) {
      prepared = [];
      for (const raw of variants) {
        const mask = stripRuleLines(raw);
        const b = inkBounds(mask, stripLeadingIcon(mask));
        if (b) prepared.push({ mask, b, blobs: columnBlobs(mask, b) });
      }
    }
    const hit = cache.get(k);
    if (hit !== undefined) return hit;
    const out: Array<Array<Map<string, number>>> = [];
    for (const { mask, b, blobs } of prepared) {
      const groups = segmentCells(mask, b, k, blobs);
      if (groups) out.push(groups.map(g => cellDistances(mask, b, g, atlas)));
    }
    cache.set(k, out);
    return out;
  };
}

function cellDistances(mask: BinMask, b: TileBox, cell: CellBlob, atlas: TextAtlas): Map<string, number> {
  const dists = new Map<string, number>();
  // vertical ink bounds within the cell, then copy it out so normalizeGlyph's
  // square padding samples blank space, not the neighboring character
  let y0 = b.y + b.h, y1 = -1;
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = cell.x0; x <= cell.x1; x++) {
      if (mask.bits[y * mask.w + x]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); break; }
    }
  }
  if (y1 < 0) return dists;
  const w = cell.x1 - cell.x0 + 1, h = y1 - y0 + 1;
  const bits = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    bits[y * w + x] = mask.bits[(y0 + y) * mask.w + (cell.x0 + x)];
  }
  const q = normalizeGlyph({ bits, w, h }, { x: 0, y: 0, w, h });
  const hFrac = h / b.h;
  const norm = q.length * QUANT;
  for (const [ch, t] of atlasQuant(atlas)) {
    if (Math.abs(t.hFrac - hFrac) > HFRAC_TOL) continue;
    let s = 0;
    for (let i = 0; i < q.length; i++) s += Math.abs(q[i] - t.q[i]);
    dists.set(ch, s / norm);
  }
  return dists;
}

/** Rank candidates by mean per-cell glyph distance (score = 1 - mean).
 *  Candidates whose length can't be segmented or with an uncovered char are
 *  skipped. */
export function matchTextAtlas(decode: CellDecoder, candidates: TextCandidate[], topN = 3): TextMatchResult[] {
  const scored: TextMatchResult[] = [];
  for (const c of candidates) {
    const chars = [...c.label];
    if (chars.length === 0) continue;
    let best = Infinity;
    for (const cells of decode(chars.length)) {
      let sum = 0;
      let ok = true;
      for (let i = 0; i < chars.length; i++) {
        const d = cells[i].get(chars[i]);
        if (d === undefined) { ok = false; break; }
        sum += d;
      }
      if (ok) best = Math.min(best, sum / chars.length);
    }
    if (!isFinite(best)) continue;
    scored.push({ key: c.key, score: 1 - best });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}

/** Atlas-first matching: decode the crop into cells and rank covered
 *  candidates by glyph distance; if the best clears ATLAS_ACCEPT that ranking
 *  wins, else fall back to canvas shape matching over the full list. */
export function matchTextHybrid(
  decode: CellDecoder | null, shape: TextShape, candidates: TextCandidate[],
  render: TextRenderer, topN = 3,
): TextMatchResult[] {
  if (decode) {
    const ranked = matchTextAtlas(decode, candidates, topN);
    if ((ranked[0]?.score ?? 0) >= ATLAS_ACCEPT) return ranked;
  }
  return matchTextShape(shape, candidates, render, topN);
}
