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

export function detectOpponentTiles(img: RgbaImage, opts: RedOpts = RED): TileBox[] {
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
