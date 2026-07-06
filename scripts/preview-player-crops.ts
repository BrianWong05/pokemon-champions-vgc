import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { loadPng } from './hp-accuracy-core';
import { detectPlayerPanels } from '../src/features/scan/playerPanels';
import { cropImage } from '../src/features/scan/segmentation';
import type { RgbaImage } from '../src/features/scan/types';

const file = process.argv[2];
if (!file) { console.error('usage: npx tsx scripts/preview-player-crops.ts training/player-screens/<file>.png'); process.exit(1); }

const outDir = 'training/.player-crop-preview';
fs.mkdirSync(outDir, { recursive: true });

function save(img: RgbaImage, name: string) {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data);
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}

const img = loadPng(file);
const det = detectPlayerPanels(img);
if (!det) { console.error('no panels detected'); process.exit(1); }
console.log(`kind=${det.kind}`);
det.panels.forEach((p, i) => {
  save(cropImage(img, p.panel), `slot${i + 1}-panel.png`);
  save(cropImage(img, p.sprite), `slot${i + 1}-sprite.png`);
  if (p.abilityText) save(cropImage(img, p.abilityText), `slot${i + 1}-ability.png`);
  if (p.itemText) save(cropImage(img, p.itemText), `slot${i + 1}-item.png`);
  p.moveTexts?.forEach((m, j) => save(cropImage(img, m), `slot${i + 1}-move${j + 1}.png`));
  p.statCells?.forEach((c, j) => {
    save(cropImage(img, c.label), `slot${i + 1}-cell${j}-label.png`);
    save(cropImage(img, c.stat), `slot${i + 1}-cell${j}-stat.png`);
    save(cropImage(img, c.sp), `slot${i + 1}-cell${j}-sp.png`);
  });
});
console.log(`wrote crops to ${outDir}`);
