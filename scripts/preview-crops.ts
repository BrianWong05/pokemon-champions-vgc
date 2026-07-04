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
import { isSupportedScreenshotFile, resolveScreenshotInput } from './image-inputs';

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
const files = (args.length > 0 ? args : fs.readdirSync(SHOTS)).filter(isSupportedScreenshotFile);

for (const f of files) {
  // Accept a bare name (looked up in training/screenshots) or any path;
  // non-PNG inputs (jpg/heic/...) convert through the labeler's sips path.
  const file = fs.existsSync(f) ? f : path.join(SHOTS, path.basename(f));
  if (!fs.existsSync(file)) {
    console.log(`${f}  (file not found)`);
    continue;
  }
  const input = resolveScreenshotInput(path.dirname(file), path.basename(file));
  const img = readPng(input.pngPath);
  const { mode, targets, gameRect } = detectScanTargets(img);
  const dir = path.join(OUT, path.basename(f, path.extname(f)));
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
