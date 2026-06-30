// src/features/scan/segmentation.ts
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
  return r > 90 && b > 55 && g < 130 && r > g + 25 && b > g + 5;
}

function isOpponentPanelRowPixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  const darkRed = (h <= 22 || h >= 338) && s >= 0.32 && v >= 0.18;
  return darkRed || isOpponentPanelColumnPixel(r, g, b);
}

function findRightmostPanelColumn(img: RgbaImage): TileBox | null {
  const y0 = Math.floor(img.height * 0.06);
  const y1 = Math.floor(img.height * 0.9);
  const minCount = img.height * 0.08;
  const runs: Array<{ x1: number; x2: number; total: number; cols: number }> = [];
  let current: { x1: number; x2: number; total: number; cols: number } | null = null;

  for (let x = 0; x < img.width; x++) {
    let count = 0;
    for (let y = y0; y < y1; y++) {
      const i = (y * img.width + x) * 4;
      if (isOpponentPanelColumnPixel(img.data[i], img.data[i + 1], img.data[i + 2])) count++;
    }
    if (count <= minCount) continue;
    if (!current || x > current.x2 + 3) {
      if (current) runs.push(current);
      current = { x1: x, x2: x, total: count, cols: 1 };
    } else {
      current.x2 = x;
      current.total += count;
      current.cols++;
    }
  }
  if (current) runs.push(current);

  const candidates = runs
    .map((r) => ({ x: r.x1, y: 0, w: r.x2 - r.x1 + 1, h: img.height }))
    .filter((b) => b.w > img.width * 0.1)
    .sort((a, b) => b.x + b.w - (a.x + a.w));

  return candidates[0] ?? null;
}

function findPanelRowBands(img: RgbaImage, column: TileBox): Band[] {
  const minCount = column.w * 0.12;
  const bands: Band[] = [];
  let current: Band | null = null;

  for (let y = 0; y < img.height; y++) {
    let count = 0;
    for (let x = column.x; x < column.x + column.w; x++) {
      const i = (y * img.width + x) * 4;
      if (isOpponentPanelRowPixel(img.data[i], img.data[i + 1], img.data[i + 2])) count++;
    }
    if (count <= minCount) continue;
    if (!current || y > current.y2 + 3) {
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

function detectOpponentTilesFromPanelColumn(img: RgbaImage): TileBox[] {
  const column = findRightmostPanelColumn(img);
  if (!column) return [];

  const bands = findPanelRowBands(img, column);
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
  const expandedX = Math.max(0, column.x - Math.round(column.w * 0.02));
  const expandedRight = Math.min(img.width - 1, column.x + column.w - 1 + Math.round(column.w * 0.25));
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
  return boxes.slice(0, 6);
}

export function detectOpponentTiles(img: RgbaImage, opts: RedOpts = RED): TileBox[] {
  const panelBoxes = detectOpponentTilesFromPanelColumn(img);
  if (panelBoxes.length >= 4) return panelBoxes;

  const minArea = Math.max(50, Math.floor(img.width * img.height * 0.0005));
  let boxes = connectedComponents(redMask(img, opts), img.width, img.height, minArea)
    .filter((b) => b.w > img.width * 0.08 && b.h > img.height * 0.03 && b.w / b.h > 1.1 && b.w / b.h < 8)
    .filter((b) => b.x + b.w / 2 > img.width * 0.5); // opponent column is on the right
  boxes.sort((a, b) => a.y - b.y);
  return boxes.slice(0, 6);
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
