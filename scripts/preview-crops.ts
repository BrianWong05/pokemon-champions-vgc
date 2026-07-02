/**
 * Debug tool: dump every crop the scan detection would take from screenshots.
 *
 * Usage:
 *   npx tsx scripts/preview-crops.ts                     # all of training/screenshots
 *   npx tsx scripts/preview-crops.ts Xnip2026-07-01_19-38-20.png [more...]
 *
 * Output: training/.crop-preview/<screenshot>/<kind>-<n>.png
 *   team-opp-*    opponent team-card sprite crops
 *   team-player-* player team-card sprite crops
 *   battle-opp-*  opponent in-battle icon crops
 *   battle-player-* player in-battle icon crops
 * Then: open training/.crop-preview
 */
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import {
  cropImage,
  detectOpponentSpriteBoxes,
  detectPlayerSpriteBoxes,
} from '../src/features/scan/segmentation';
import { detectBattleIcons } from '../src/features/scan/battleDetection';
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
  const kinds: Array<[string, ReturnType<typeof detectOpponentSpriteBoxes>]> = [
    ['team-opp', detectOpponentSpriteBoxes(img)],
    ['team-player', detectPlayerSpriteBoxes(img)],
    ['battle-opp', detectBattleIcons(img, 'opponent')],
    ['battle-player', detectBattleIcons(img, 'player')],
  ];
  const dir = path.join(OUT, path.basename(f, '.png'));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const counts: string[] = [];
  for (const [kind, boxes] of kinds) {
    boxes.forEach((box, i) => writePng(cropImage(img, box), path.join(dir, `${kind}-${i}.png`)));
    if (boxes.length > 0) counts.push(`${kind}=${boxes.length}`);
  }
  console.log(`${f}  ${counts.join(' ') || '(nothing detected)'}`);
}
console.log(`\nCrops written to ${OUT} — run: open "${OUT}"`);
