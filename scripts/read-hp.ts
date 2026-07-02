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
import { readHpFromPanel, measureHpBarFill } from '../src/features/scan/hpText';
import type { RgbaImage } from '../src/features/scan/types';

const SHOTS = path.resolve('training/screenshots');

function readPng(file: string): RgbaImage {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

const args = process.argv.slice(2);
const files = (args.length > 0 ? args : fs.readdirSync(SHOTS)).filter((f) => f.toLowerCase().endsWith('.png'));

for (const f of files) {
  const img = readPng(path.join(SHOTS, path.basename(f)));
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
}
