import type { Descriptor, RgbaImage } from './types';

export function grayResize(img: RgbaImage, w: number, h: number): Float64Array {
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y + 0.5) * img.height / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x + 0.5) * img.width / w));
      const i = (sy * img.width + sx) * 4;
      out[y * w + x] = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    }
  }
  return out;
}

export function dHash(img: RgbaImage): string {
  const g = grayResize(img, 9, 8); // 9 wide, 8 tall -> 64 horizontal comparisons
  let bits = 0n, bit = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (g[y * 9 + x] < g[y * 9 + x + 1]) bits |= (1n << bit);
      bit++;
    }
  }
  return bits.toString(16).padStart(16, '0');
}

export function hamming(a: string, b: string): number {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b), count = 0;
  while (x > 0n) { count += Number(x & 1n); x >>= 1n; }
  return count;
}

function sampleGrid(img: RgbaImage, n: number, fn: (i: number) => void): void {
  for (let y = 0; y < n; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y + 0.5) * img.height / n));
    for (let x = 0; x < n; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x + 0.5) * img.width / n));
      fn((sy * img.width + sx) * 4);
    }
  }
}

export function rgb16vec(img: RgbaImage): number[] {
  const out: number[] = [];
  sampleGrid(img, 16, (i) => out.push(img.data[i], img.data[i + 1], img.data[i + 2]));
  return out;
}

export function silhouette8(img: RgbaImage): number[] {
  const out: number[] = [];
  sampleGrid(img, 8, (i) => out.push(img.data[i + 3] > 127 ? 1 : 0));
  return out;
}

export function edge8(img: RgbaImage): number[] {
  const g = grayResize(img, 10, 10);
  const at = (x: number, y: number) => g[y * 10 + x];
  const out: number[] = [];
  for (let y = 1; y <= 8; y++) {
    for (let x = 1; x <= 8; x++) {
      const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) -
                 (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) -
                 (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      out.push(Math.min(255, Math.round(Math.sqrt(gx * gx + gy * gy) / 4)));
    }
  }
  return out;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function computeDescriptor(img: RgbaImage): Descriptor {
  return { dhash: dHash(img), rgb16: rgb16vec(img), sil8: silhouette8(img), edge8: edge8(img) };
}
