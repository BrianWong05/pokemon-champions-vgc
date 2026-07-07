// scripts/generate-sprite-descriptors.ts
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import { computeDescriptor } from '../src/features/scan/fingerprint';
import type { Descriptor, RgbaImage } from '../src/features/scan/types';

export function readPng(file: string): RgbaImage {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

// Reference sprite files follow `<id>[_<variant>].png` (e.g. `25.png`, `25_shiny.png`,
// `25_battle1.png`). The id is the part of the filename before the first underscore.
// Multiple files may share an id (normal + shiny + extra captures); their descriptors
// are grouped into an array under that id.
export function generateDescriptors(srcDir: string): Record<string, Descriptor[]> {
  const out: Record<string, Descriptor[]> = {};
  for (const f of fs.readdirSync(srcDir)) {
    if (!f.endsWith('.png')) continue;
    const id = path.basename(f, '.png').split('_')[0];
    if (!/^\d+$/.test(id)) continue;
    try {
      const descriptor = computeDescriptor(readPng(path.join(srcDir, f)));
      (out[id] ??= []).push(descriptor);
    }
    catch (e) { console.warn(`skip ${f}: ${(e as Error).message}`); }
  }
  return out;
}

// Panel background tone the live player-panel sprite crop sits on (measured
// across en-rental/zh-team17/ja-rental-r676 fixtures — see task-7-report.md
// "Fix C"). Reference menu-sprite files sit on their own light-lavender card
// background instead, which is a structurally different backdrop for
// dhash/rgb16/edge8 to compare against a live crop.
export const PANEL_BG: [number, number, number] = [169, 151, 207];

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
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

// The rounded card thumbnail's corner vignette is a bright, low-saturation
// purple-family tone — same hue family as the flat interior background, just
// a bit darker/more saturated at the curve. Real sprite art is essentially
// never this pale, so this is a safe supplemental "still background" test.
function isCardBorderTone(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  return h >= 225 && h <= 280 && s <= 0.3 && v >= 0.8;
}

// Menu-sprite reference files are a rounded-card thumbnail: light lavender
// interior + a darker vignette border, both in the same purple hue family as
// the live panel background, just lighter/less saturated. A flood-fill (BFS
// from all 4 corners, comparing each pixel only to its already-flooded
// neighbor) recolors the whole background region without a fixed reference
// color, stopping at the sprite's own edge — but a sharp step in the corner's
// curved gradient can locally exceed the per-step tolerance and strand a
// patch of border disconnected from the flood, so a second pass sweeps in
// any remaining pixel that's independently still a card-border/vignette tone.
function floodBackgroundMask(img: RgbaImage, tol = 14): Uint8Array {
  const { width, height, data } = img;
  const isBg = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const seeds = [0, width - 1, (height - 1) * width, (height - 1) * width + width - 1];
  for (const s of seeds) { queue.push(s); visited[s] = 1; isBg[s] = 1; }
  const close = (i: number, j: number) => {
    const di = i * 4, dj = j * 4;
    return Math.abs(data[di] - data[dj]) <= tol && Math.abs(data[di + 1] - data[dj + 1]) <= tol &&
      Math.abs(data[di + 2] - data[dj + 2]) <= tol;
  };
  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    const x = p % width, y = (p / width) | 0;
    const neighbors: number[] = [];
    if (x > 0) neighbors.push(p - 1);
    if (x < width - 1) neighbors.push(p + 1);
    if (y > 0) neighbors.push(p - width);
    if (y < height - 1) neighbors.push(p + width);
    for (const n of neighbors) {
      if (visited[n]) continue;
      visited[n] = 1;
      if (close(p, n)) { isBg[n] = 1; queue.push(n); }
    }
  }
  for (let p = 0; p < isBg.length; p++) {
    if (isBg[p]) continue;
    const i = p * 4;
    if (isCardBorderTone(data[i], data[i + 1], data[i + 2])) isBg[p] = 1;
  }
  return isBg;
}

// Recolors background to panel purple and trims to the sprite's content
// bounding box (+ small padding) — the same tight, panel-colored framing
// `refineSpritePanelBox` produces for the live crop.
export function toPanelRealisticCrop(img: RgbaImage): RgbaImage {
  const mask = floodBackgroundMask(img);
  let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (mask[y * img.width + x]) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX < minX) { minX = 0; minY = 0; maxX = img.width - 1; maxY = img.height - 1; }
  const pad = 4;
  const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
  const x1 = Math.min(img.width, maxX + 1 + pad), y1 = Math.min(img.height, maxY + 1 + pad);
  const w = x1 - x0, h = y1 - y0;
  const out: RgbaImage = { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x0 + x, sy = y0 + y;
    const si = (sy * img.width + sx) * 4, di = (y * w + x) * 4;
    if (mask[sy * img.width + sx]) {
      out.data[di] = PANEL_BG[0]; out.data[di + 1] = PANEL_BG[1]; out.data[di + 2] = PANEL_BG[2]; out.data[di + 3] = 255;
    } else {
      out.data[di] = img.data[si]; out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2]; out.data[di + 3] = 255;
    }
  }
  return out;
}

// One descriptor per id, generated from that id's single "clean" menu-sprite
// file (`<id>.png` — a centered, uniformly-framed card thumbnail) composited
// onto the live panel's purple background. Ids whose only capture is a
// `_Xnip*`-suffixed battle-screen crop (arbitrary background, no reliable
// corner-flood) still get a best-effort descriptor from that file — rare
// (6/214 ids at time of writing) and not exercised by the golden fixtures.
export function generatePanelDescriptors(srcDir: string): Record<string, Descriptor[]> {
  const byId = new Map<string, string>(); // id -> chosen filename (prefers non-Xnip)
  for (const f of fs.readdirSync(srcDir)) {
    if (!f.endsWith('.png')) continue;
    const id = path.basename(f, '.png').split('_')[0];
    if (!/^\d+$/.test(id)) continue;
    const isClean = !f.includes('Xnip');
    if (isClean || !byId.has(id)) byId.set(id, f);
  }
  const out: Record<string, Descriptor[]> = {};
  for (const [id, f] of byId) {
    try {
      const cropped = toPanelRealisticCrop(readPng(path.join(srcDir, f)));
      out[id] = [computeDescriptor(cropped)];
    } catch (e) { console.warn(`skip ${f}: ${(e as Error).message}`); }
  }
  return out;
}

// CLI: npx tsx scripts/generate-sprite-descriptors.ts
if (process.argv[1] && process.argv[1].endsWith('generate-sprite-descriptors.ts')) {
  const src = path.resolve('training/menu-sprites');
  const outFile = path.resolve('public/images/pokemon/reference-descriptors.json');
  const out = generateDescriptors(src);
  fs.writeFileSync(outFile, JSON.stringify(out));
  const idCount = Object.keys(out).length;
  const descriptorCount = Object.values(out).reduce((sum, ds) => sum + ds.length, 0);
  console.log(`Wrote ${descriptorCount} descriptors for ${idCount} ids to ${outFile}`);

  const panelOutFile = path.resolve('public/images/pokemon/player-panel-descriptors.json');
  const panelOut = generatePanelDescriptors(src);
  fs.writeFileSync(panelOutFile, JSON.stringify(panelOut));
  const panelIdCount = Object.keys(panelOut).length;
  console.log(`Wrote ${panelIdCount} panel-realistic descriptors to ${panelOutFile}`);
}
