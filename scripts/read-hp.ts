/**
 * Debug tool: read the HP text of every battle nameplate in screenshots.
 *
 * Usage:
 *   npx tsx scripts/read-hp.ts                          # all battle screenshots
 *   npx tsx scripts/read-hp.ts Xnip2026-07-01_18-08-40.png [more...]
 *
 * Prints one line per detected nameplate: side, exact glyph reading (or "-"
 * when the reader isn't confident) and the raw bar-fill estimate. A "-" means
 * the app would leave HP at 100% for manual adjustment — never a wrong value.
 */
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import { detectBattlePanels } from '../src/features/scan/battleDetection';
import { battleView } from './hp-accuracy-core';
import { isSupportedScreenshotFile, resolveScreenshotInput } from './image-inputs';
import { readHpFromPanel, measureHpBarFill, hpTextRegion, whiteMask, extractGlyphs, clusterGlyphBoxes, filterSpecks, GLYPH_PIPELINE_CONFIGS } from '../src/features/scan/hpText';
import type { RgbaImage } from '../src/features/scan/types';

const SHOTS = path.resolve('training/screenshots');

function readPng(file: string): RgbaImage {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

// --debug: write an annotated overlay (plate / text region / bar window) and
// per-plate mask+glyph images to training/.hp-debug/<screenshot>/.
const DEBUG = process.argv.includes('--debug');
const DEBUG_OUT = path.resolve('training/.hp-debug');

function writePng(img: RgbaImage, file: string): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data.set(img.data);
  fs.writeFileSync(file, PNG.sync.write(png));
}

function drawBox(img: RgbaImage, b: { x: number; y: number; w: number; h: number }, r: number, g: number, bl: number): void {
  for (let x = b.x; x < Math.min(img.width, b.x + b.w); x++) {
    for (const y of [b.y, b.y + b.h - 1]) {
      if (y < 0 || y >= img.height) continue;
      const i = (y * img.width + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = bl;
    }
  }
  for (let y = b.y; y < Math.min(img.height, b.y + b.h); y++) {
    for (const x of [b.x, b.x + b.w - 1]) {
      if (x < 0 || x >= img.width) continue;
      const i = (y * img.width + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = bl;
    }
  }
}

const args = process.argv.slice(2).filter((a) => a !== '--debug');
const files = (args.length > 0 ? args : fs.readdirSync(SHOTS)).filter(isSupportedScreenshotFile);

for (const f of files) {
  // Accept a bare name (looked up in training/screenshots) or any path.
  const file = fs.existsSync(f) ? f : path.join(SHOTS, path.basename(f));
  if (!fs.existsSync(file)) {
    console.log(`${f}\n  (file not found)`);
    continue;
  }
  // Non-PNG inputs (jpg/heic/...) are converted the same way the labeler does.
  const input = resolveScreenshotInput(path.dirname(file), path.basename(file));
  // battleView applies the game-rect fallback for framed captures (browser
  // windows, video frames) before panel detection.
  const img = battleView(readPng(input.pngPath));
  // Only actual battle screens (both opponent plates present) — team-select
  // screenshots produce stray single-panel detections that never carry HP.
  if (detectBattlePanels(img, 'opponent').length !== 2) {
    if (args.length > 0) console.log(`${f}\n  (not recognized as a battle screen — no opponent plate pair found)`);
    continue;
  }
  const lines: string[] = [];
  for (const side of ['opponent', 'player'] as const) {
    detectBattlePanels(img, side).forEach((panel, i) => {
      const reading = readHpFromPanel(img, panel);
      const text = reading == null
        ? '-'
        : reading.current != null
          ? `${reading.current}/${reading.max} (${reading.percent}%)`
          : `${reading.percent}%`;
      const bar = measureHpBarFill(img, panel);
      lines.push(`  ${side} ${i + 1}: ${text}${bar != null ? `   [bar ~${Math.round(bar * 100)}%]` : ''}`);
    });
  }
  if (lines.length > 0) console.log(`${f}\n${lines.join('\n')}`);

  if (DEBUG) {
    const dir = path.join(DEBUG_OUT, path.basename(f, path.extname(f)));
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const overlay: RgbaImage = { data: Uint8ClampedArray.from(img.data), width: img.width, height: img.height };
    for (const side of ['opponent', 'player'] as const) {
      detectBattlePanels(img, side).forEach((panel, i) => {
        const text = hpTextRegion(panel, img);
        const barY0 = Math.min(img.height - 1, panel.y + Math.round(panel.h * 0.2));
        const bar = { x: panel.x, y: barY0, w: Math.min(panel.w, img.width - panel.x), h: Math.min(Math.round(panel.h * 1.6), img.height - barY0) };
        drawBox(overlay, panel, 60, 120, 255); // blue: detected plate
        drawBox(overlay, bar, 60, 220, 60);    // green: bar search window
        drawBox(overlay, text, 255, 60, 60);   // red: HP text region
        const mask = whiteMask(img, text, 0.8);
        const { mask: processed, boxes } = extractGlyphs(mask, GLYPH_PIPELINE_CONFIGS[0]);
        const glyphs = clusterGlyphBoxes(filterSpecks(boxes)).flat();
        const m: RgbaImage = { data: new Uint8ClampedArray(processed.w * processed.h * 4), width: processed.w, height: processed.h };
        for (let p = 0; p < processed.bits.length; p++) {
          const v = processed.bits[p] ? 255 : 0;
          m.data[p * 4] = v; m.data[p * 4 + 1] = v; m.data[p * 4 + 2] = v; m.data[p * 4 + 3] = 255;
        }
        for (const g of glyphs) drawBox(m, g, 255, 60, 60);
        writePng(m, path.join(dir, `${side}${i + 1}-glyphs.png`));
      });
    }
    writePng(overlay, path.join(dir, 'regions.png'));
    console.log(`  (debug images -> ${path.relative(process.cwd(), dir)})`);
  }
}
