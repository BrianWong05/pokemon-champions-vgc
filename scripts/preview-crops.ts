/**
 * Debug tool: dump every crop the scan pipeline would take from screenshots.
 * Runs the REAL pipeline (detectScanTargets): mode routing (team vs battle),
 * both sides, and game-rect inference for framed/video-frame images.
 *
 * Usage:
 *   npx tsx scripts/preview-crops.ts                     # all of training/screenshots
 *   npx tsx scripts/preview-crops.ts Xnip2026-07-01_19-38-20.png [more...]
 *
 * Output: training/.crop-preview/<screenshot>/<mode>-<side>-<n>.png
 * Then: open training/.crop-preview
 */
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import { cropImage } from '../src/features/scan/segmentation';
import { detectScanTargets } from '../src/features/scan/scanTargets';
import type { RgbaImage } from '../src/features/scan/types';

const SHOTS = path.resolve('training/screenshots');
const OUT = path.resolve('training/.crop-preview');

function readPng(file: string): RgbaImage {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

function writePng(img: RgbaImage, file: string): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data.set(img.data);
  fs.writeFileSync(file, PNG.sync.write(png));
}

const args = process.argv.slice(2);
const files = (args.length > 0 ? args : fs.readdirSync(SHOTS)).filter((f) => f.toLowerCase().endsWith('.png'));

for (const f of files) {
  const img = readPng(path.join(SHOTS, path.basename(f)));
  const { mode, targets, gameRect } = detectScanTargets(img);
  const dir = path.join(OUT, path.basename(f, '.png'));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const counters: Record<string, number> = {};
  for (const t of targets) {
    const kind = `${mode}-${t.side === 'player' ? 'player' : 'opp'}`;
    const n = counters[kind] ?? 0;
    counters[kind] = n + 1;
    writePng(cropImage(img, t.box), path.join(dir, `${kind}-${n}.png`));
  }
  const summary = Object.entries(counters).map(([k, n]) => `${k}=${n}`).join(' ');
  console.log(`${f}  ${summary || '(nothing detected)'}${gameRect ? '  [game rect inferred]' : ''}`);
}
console.log(`\nCrops written to ${OUT} — run: open "${OUT}"`);
