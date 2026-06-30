import type { RgbaImage } from './types';

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
