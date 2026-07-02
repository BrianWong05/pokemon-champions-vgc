// src/features/scan/segmentation.ts
import { spriteBoxFromTile } from './cropMath';
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

interface Band { y1: number; y2: number; total: number; rows: number }

function isOpponentPanelColumnPixel(r: number, g: number, b: number): boolean {
  // Opponent panels are RED-dominant. Require r clearly above BOTH g and b so the
  // blue/purple PLAYER column (high blue) is excluded — otherwise the detector
  // locks onto the player's team instead of the opponent's.
  return r > 90 && g < 120 && r > g + 40 && r > b + 20;
}

function isOpponentPanelRowPixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  const darkRed = (h <= 22 || h >= 338) && s >= 0.32 && v >= 0.18;
  return darkRed || isOpponentPanelColumnPixel(r, g, b);
}

function isEmbeddedPanelRowPixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  const darkRed = (h <= 25 || h >= 335) && s >= 0.24 && v >= 0.14;
  const darkPanel = r > 85 && g < 85 && b < 120 && r > g + 15;
  return darkRed || darkPanel || isOpponentPanelColumnPixel(r, g, b);
}

function findPanelColumn(
  img: RgbaImage,
  minCountRatio: number,
  minWidthRatio: number,
  maxGap: number,
  preferSide: 'left' | 'right',
  isColumnPixel: (r: number, g: number, b: number) => boolean,
): TileBox | null {
  const y0 = Math.floor(img.height * 0.06);
  const y1 = Math.floor(img.height * 0.9);
  const minCount = img.height * minCountRatio;
  const runs: Array<{ x1: number; x2: number; total: number; cols: number }> = [];
  let current: { x1: number; x2: number; total: number; cols: number } | null = null;

  for (let x = 0; x < img.width; x++) {
    let count = 0;
    for (let y = y0; y < y1; y++) {
      const i = (y * img.width + x) * 4;
      if (isColumnPixel(img.data[i], img.data[i + 1], img.data[i + 2])) count++;
    }
    if (count <= minCount) continue;
    if (!current || x > current.x2 + maxGap) {
      if (current) runs.push(current);
      current = { x1: x, x2: x, total: count, cols: 1 };
    } else {
      current.x2 = x;
      current.total += count;
      current.cols++;
    }
  }
  if (current) runs.push(current);

  let candidates = runs
    .map((r) => ({ x: r.x1, y: 0, w: r.x2 - r.x1 + 1, h: img.height, score: r.total * (r.x2 - r.x1 + 1) }))
    .filter((b) => b.w > Math.max(80, img.width * minWidthRatio));

  const preferred = candidates.filter((b) =>
    preferSide === 'right' ? b.x + b.w / 2 > img.width * 0.5 : b.x + b.w / 2 < img.width * 0.5,
  );
  if (preferred.length > 0) candidates = preferred;

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best ? { x: best.x, y: best.y, w: best.w, h: best.h } : null;
}

function findRightmostPanelColumn(img: RgbaImage): TileBox | null {
  return findPanelColumn(img, 0.08, 0.1, 3, 'right', isOpponentPanelColumnPixel);
}

function findEmbeddedPanelColumn(img: RgbaImage): TileBox | null {
  return findPanelColumn(img, 0.03, 0.055, Math.max(3, Math.round(img.width * 0.025)), 'right', isOpponentPanelColumnPixel);
}

function findPanelRowBands(
  img: RgbaImage,
  column: TileBox,
  isRowPixel = isOpponentPanelRowPixel,
  maxGap = 3,
  adaptiveRows = false,
): Band[] {
  const counts = new Array<number>(img.height).fill(0);
  for (let y = 0; y < img.height; y++) {
    let count = 0;
    for (let x = column.x; x < column.x + column.w; x++) {
      const i = (y * img.width + x) * 4;
      if (isRowPixel(img.data[i], img.data[i + 1], img.data[i + 2])) count++;
    }
    counts[y] = count;
  }

  let minCount = column.w * 0.12;
  if (adaptiveRows) {
    // Purple floor/reflections can keep gap rows above a fixed low threshold.
    // Card rows cluster near the column's peak coverage, so half of the 90th
    // percentile separates cards from background regardless of the frame.
    const sorted = [...counts].sort((a, b) => a - b);
    minCount = Math.max(minCount, sorted[Math.floor(sorted.length * 0.9)] * 0.5);
  }

  const bands: Band[] = [];
  let current: Band | null = null;
  for (let y = 0; y < img.height; y++) {
    const count = counts[y];
    if (count <= minCount) continue;
    if (!current || y > current.y2 + maxGap) {
      if (current) bands.push(current);
      current = { y1: y, y2: y, total: count, rows: 1 };
    } else {
      current.y2 = y;
      current.total += count;
      current.rows++;
    }
  }
  if (current) bands.push(current);
  return bands;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function boxesFromPanelColumn(
  img: RgbaImage,
  column: TileBox,
  isRowPixel = isOpponentPanelRowPixel,
  expandSide: 'left' | 'right' = 'right',
  maxGap = 3,
  adaptiveRows = false,
): TileBox[] {
  const bands = findPanelRowBands(img, column, isRowPixel, maxGap, adaptiveRows);
  const eligible = bands.filter((b) => {
    const center = (b.y1 + b.y2 + 1) / 2;
    const h = b.y2 - b.y1 + 1;
    return center > img.height * 0.08 && center < img.height * 0.98 && h > img.height * 0.015;
  });
  const tileH = median(
    eligible
      .map((b) => b.y2 - b.y1 + 1)
      .filter((h) => h > img.height * 0.04 && h < img.height * 0.18)
  ) ?? Math.round(img.height * 0.11);
  const minTileH = tileH * 0.6;
  const bigPad = Math.round(column.w * 0.25);
  const smallPad = Math.round(column.w * 0.02);
  const expandedX = Math.max(0, column.x - (expandSide === 'left' ? bigPad : smallPad));
  const expandedRight = Math.min(img.width - 1, column.x + column.w - 1 + (expandSide === 'right' ? bigPad : smallPad));
  const boxes: TileBox[] = [];

  for (const band of eligible) {
    const bandH = band.y2 - band.y1 + 1;
    if (bandH < minTileH) continue;
    const count = Math.max(1, Math.round(bandH / tileH));
    if (count === 1) {
      boxes.push({ x: expandedX, y: band.y1, w: expandedRight - expandedX + 1, h: bandH });
      continue;
    }
    const gap = Math.max(0, (bandH - count * tileH) / Math.max(1, count - 1));
    for (let i = 0; i < count; i++) {
      boxes.push({
        x: expandedX,
        y: Math.round(band.y1 + i * (tileH + gap)),
        w: expandedRight - expandedX + 1,
        h: tileH,
      });
    }
  }

  boxes.sort((a, b) => a.y - b.y);
  if (boxes.length >= 4 && boxes[0].y > img.height * 0.35) return [];
  return boxes.slice(0, 6);
}

function detectOpponentTilesFromPanelColumn(img: RgbaImage): TileBox[] {
  const column = findRightmostPanelColumn(img);
  return column ? boxesFromPanelColumn(img, column) : [];
}

function detectOpponentTilesFromEmbeddedPanelColumn(img: RgbaImage): TileBox[] {
  const column = findEmbeddedPanelColumn(img);
  return column ? boxesFromPanelColumn(img, column, isEmbeddedPanelRowPixel) : [];
}

export function detectOpponentTiles(img: RgbaImage, opts: RedOpts = RED): TileBox[] {
  const panelBoxes = detectOpponentTilesFromPanelColumn(img);
  if (panelBoxes.length >= 4) return panelBoxes;
  const embeddedPanelBoxes = detectOpponentTilesFromEmbeddedPanelColumn(img);
  if (embeddedPanelBoxes.length >= 6) return embeddedPanelBoxes;

  const minArea = Math.max(50, Math.floor(img.width * img.height * 0.0005));
  let boxes = connectedComponents(redMask(img, opts), img.width, img.height, minArea)
    .filter((b) => b.w > img.width * 0.08 && b.h > img.height * 0.03 && b.w / b.h > 1.1 && b.w / b.h < 8)
    .filter((b) => b.x + b.w / 2 > img.width * 0.5); // opponent column is on the right
  boxes.sort((a, b) => a.y - b.y);
  if (boxes.length >= 4 && boxes[0].y > img.height * 0.35) return [];
  return boxes.slice(0, 6);
}

function isPlayerPanelColumnPixel(r: number, g: number, b: number): boolean {
  // Player cards are BLUE/PURPLE-dominant — the mirror of the opponent's red.
  return b > 110 && b > r + 30 && b > g + 50;
}

// The card under the joycon/finger cursor turns bright lime, and once all 4
// picks are locked in ("standing by") the chosen cards turn white with a wide
// lime diagonal stripe. The lime is present in both states, so purple ∪ lime
// covers every card state. (Plain white is NOT in the detection mask — the
// arena background is full of bright pixels.)
function isLimeHighlightPixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  return h >= 60 && h <= 110 && s >= 0.35 && v >= 0.45;
}

function isPlayerCardStatePixel(r: number, g: number, b: number): boolean {
  return isPlayerPanelColumnPixel(r, g, b) || isLimeHighlightPixel(r, g, b);
}

function isPlayerPanelRowPixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  const purple = h >= 225 && h <= 290 && s >= 0.3 && v >= 0.2;
  return purple || isPlayerCardStatePixel(r, g, b);
}

function playerMask(img: RgbaImage): Uint8Array {
  const mask = new Uint8Array(img.width * img.height);
  for (let p = 0; p < mask.length; p++) {
    const i = p * 4;
    if (img.data[i + 3] > 0 && isPlayerCardStatePixel(img.data[i], img.data[i + 1], img.data[i + 2])) mask[p] = 1;
  }
  return mask;
}

// The player name banner is the same purple as the cards but noticeably
// shorter — drop bands well under the median tile height.
function dropShortTiles(boxes: TileBox[]): TileBox[] {
  if (boxes.length < 2) return boxes;
  const hs = boxes.map((b) => b.h).sort((a, b) => a - b);
  const med = hs[Math.floor(hs.length / 2)];
  return boxes.filter((b) => b.h >= med * 0.75);
}

export function detectPlayerTiles(img: RgbaImage): TileBox[] {
  const column = findPanelColumn(img, 0.08, 0.1, 3, 'left', isPlayerCardStatePixel);
  // Tight, resolution-scaled band gap: the hovered card's lime glow nearly
  // bridges the banner->card gap (~2 rows at 720p), while in-card divider dips
  // are 1 row — the default tolerance of 3 merges cards with the banner.
  const bandGap = Math.max(1, Math.round(img.height * 0.0015));
  // Higher row threshold than the opponent side: purple arena floor/reflections
  // can keep gap rows above a low threshold and merge adjacent cards. Card rows
  // fill nearly the whole column; floor-only rows do not.
  // Some frames need the adaptive threshold (purple floor merges bottom cards),
  // others the fixed one (low purple coverage inside cards). Run both and keep
  // whichever yields a full 6-card column, else the richer result.
  const variants = column
    ? [true, false].map((adaptive) =>
        dropShortTiles(boxesFromPanelColumn(img, column, isPlayerPanelRowPixel, 'left', bandGap, adaptive)))
    : [[], []];
  const panelBoxes =
    variants.find((v) => v.length === 6) ??
    (variants[0].length >= variants[1].length ? variants[0] : variants[1]);
  if (panelBoxes.length >= 4) return panelBoxes.slice(0, 6);

  const minArea = Math.max(50, Math.floor(img.width * img.height * 0.0005));
  const boxes = connectedComponents(playerMask(img), img.width, img.height, minArea)
    .filter((b) => b.w > img.width * 0.08 && b.h > img.height * 0.03 && b.w / b.h > 1.1 && b.w / b.h < 8)
    .filter((b) => b.x + b.w / 2 < img.width * 0.5); // player column is on the left
  boxes.sort((a, b) => a.y - b.y);
  if (boxes.length >= 4 && boxes[0].y > img.height * 0.35) return [];
  return dropShortTiles(boxes).slice(0, 6);
}

function isOpponentCardPixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  return (h <= 30 || h >= 325) && s >= 0.25 && v >= 0.12;
}

function isPlayerCardPixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  // For crop refinement (NOT detection) the white body of a locked-in card
  // also counts as card background, so the sprite stays the dominant content.
  const white = s <= 0.18 && v >= 0.7;
  return white || (h >= 225 && h <= 300 && s >= 0.25 && v >= 0.15) || isPlayerCardStatePixel(r, g, b);
}

function largestRun(flags: boolean[], maxGap: number): { start: number; end: number } | null {
  let best: { start: number; end: number } | null = null;
  let cur: { start: number; end: number } | null = null;
  let gap = 0;
  const better = (a: { start: number; end: number }) => !best || a.end - a.start > best.end - best.start;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i]) {
      if (cur) cur.end = i; else cur = { start: i, end: i };
      gap = 0;
    } else if (cur && ++gap > maxGap) {
      if (better(cur)) best = cur;
      cur = null;
      gap = 0;
    }
  }
  if (cur && better(cur)) best = cur;
  return best;
}

/**
 * Content-aware sprite crop: within the card's own rows, the sprite is the
 * widest run of columns that are NOT card-colored (name text/type icons are
 * separated from it by card-colored gaps). Centering on that run lets the
 * square be tighter (1.35x card height) than a blind anchor crop, so
 * neighboring cards' sprites stop bleeding into the top/bottom of the crop.
 * Falls back to the anchor-based box when no content is found.
 */
export function refineSpriteBox(
  img: RgbaImage,
  tile: TileBox,
  anchor: 'left' | 'right',
  isCardPixel: (r: number, g: number, b: number) => boolean,
): TileBox {
  const bounds = { w: img.width, h: img.height };
  const stripW = Math.min(tile.w, Math.round(tile.h * 1.7));
  const x0 = Math.max(0, anchor === 'left' ? tile.x : tile.x + tile.w - stripW);
  const y0 = Math.max(0, tile.y + 2);
  const y1 = Math.min(img.height, tile.y + tile.h - 2);
  if (y1 - y0 < 4) return spriteBoxFromTile(tile, bounds, anchor);

  const colFlags: boolean[] = [];
  for (let x = x0; x < Math.min(img.width, x0 + stripW); x++) {
    let cnt = 0;
    for (let y = y0; y < y1; y++) {
      const i = (y * img.width + x) * 4;
      if (!isCardPixel(img.data[i], img.data[i + 1], img.data[i + 2])) cnt++;
    }
    colFlags.push(cnt > (y1 - y0) * 0.15);
  }

  const run = largestRun(colFlags, Math.max(2, Math.round(tile.h * 0.1)));
  if (!run || run.end - run.start < tile.h * 0.3) return spriteBoxFromTile(tile, bounds, anchor);

  const side = Math.round(tile.h * 1.35);
  const cx = x0 + (run.start + run.end) / 2;
  // Vertically the sprite fills the card and overflows slightly upward.
  const cy = tile.y + tile.h / 2 - Math.round(tile.h * 0.05);
  const x = Math.max(0, Math.min(Math.round(cx - side / 2), bounds.w - 1));
  const y = Math.max(0, Math.min(Math.round(cy - side / 2), bounds.h - 1));
  return {
    x,
    y,
    w: Math.max(1, Math.min(side, bounds.w - x)),
    h: Math.max(1, Math.min(side, bounds.h - y)),
  };
}

export function detectOpponentSpriteBoxes(img: RgbaImage): TileBox[] {
  return detectOpponentTiles(img).map((t) => refineSpriteBox(img, t, 'left', isOpponentCardPixel));
}

export function detectPlayerSpriteBoxes(img: RgbaImage): TileBox[] {
  return detectPlayerTiles(img).map((t) => refineSpriteBox(img, t, 'right', isPlayerCardPixel));
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
