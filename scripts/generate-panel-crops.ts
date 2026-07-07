// scripts/generate-panel-crops.ts
//
// Panel-composited TRAINING crops for the sprite classifier: every class id
// rendered the way the live player-panel crop actually looks (sprite on the
// panel's purple background, content-trimmed, small padding) — the same
// framing `refineSpritePanelBox` + `toPanelRealisticCrop` produce. Two
// sources per id where available:
//   <id>_panelmenu.png  — the id's clean menu-sprite card thumbnail
//                         (training/menu-sprites/<id>.png), flood-recolored
//   <id>_panelthumb.png — the app sprite (public/images/pokemon/thumbnails/
//                         <id>.png), alpha-composited (same art the game's
//                         panel icons are rendered from)
// Output goes to training/panel-crops/ (gitignored — fully derivable).
// Feed it to scripts/train_sprite_net.py alongside training/menu-sprites/.
//
// CLI: npx tsx scripts/generate-panel-crops.ts
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import { readPng, toPanelRealisticCrop, PANEL_BG } from './generate-sprite-descriptors';
import type { RgbaImage } from '../src/features/scan/types';

// Transparent-background sprite -> panel crop: alpha-blend over panel purple,
// trimmed to the alpha content box (+ the same 4px pad toPanelRealisticCrop uses).
export function alphaToPanelCrop(img: RgbaImage): RgbaImage {
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (img.data[(y * img.width + x) * 4 + 3] <= 16) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX < 0) throw new Error('fully transparent image');
  const pad = 4;
  const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
  const x1 = Math.min(img.width, maxX + 1 + pad), y1 = Math.min(img.height, maxY + 1 + pad);
  const w = x1 - x0, h = y1 - y0;
  const out: RgbaImage = { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = ((y0 + y) * img.width + (x0 + x)) * 4, di = (y * w + x) * 4;
    const a = img.data[si + 3] / 255;
    for (let c = 0; c < 3; c++) out.data[di + c] = Math.round(img.data[si + c] * a + PANEL_BG[c] * (1 - a));
    out.data[di + 3] = 255;
  }
  return out;
}

function writePng(file: string, img: RgbaImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data);
  fs.writeFileSync(file, PNG.sync.write(png));
}

if (process.argv[1] && process.argv[1].endsWith('generate-panel-crops.ts')) {
  const menuDir = path.resolve('training/menu-sprites');
  const thumbDir = path.resolve('public/images/pokemon/thumbnails');
  const outDir = path.resolve('training/panel-crops');
  const classes: number[] = JSON.parse(
    fs.readFileSync('public/models/pokemon-sprite-net/classes.json', 'utf8'),
  );
  fs.mkdirSync(outDir, { recursive: true });

  // Clean (non-Xnip) menu-sprite file per id — same chooser as
  // generatePanelDescriptors; Xnip battle crops have no flood-fillable
  // corners and already sit in the training set untouched.
  const cleanById = new Map<string, string>();
  for (const f of fs.readdirSync(menuDir)) {
    if (!f.endsWith('.png') || f.includes('Xnip')) continue;
    const id = path.basename(f, '.png').split('_')[0];
    if (/^\d+$/.test(id) && !cleanById.has(id)) cleanById.set(id, f);
  }

  let nMenu = 0, nThumb = 0;
  const uncovered: number[] = [];
  for (const cls of classes) {
    const id = String(cls);
    const menuFile = cleanById.get(id);
    if (menuFile) {
      writePng(path.join(outDir, `${id}_panelmenu.png`), toPanelRealisticCrop(readPng(path.join(menuDir, menuFile))));
      nMenu++;
    }
    const thumbFile = path.join(thumbDir, `${id}.png`);
    if (fs.existsSync(thumbFile)) {
      writePng(path.join(outDir, `${id}_panelthumb.png`), alphaToPanelCrop(readPng(thumbFile)));
      nThumb++;
    }
    if (!menuFile && !fs.existsSync(thumbFile)) uncovered.push(cls);
  }
  console.log(`Wrote ${nMenu} menu-sprite + ${nThumb} thumbnail panel crops to ${outDir}`);
  if (uncovered.length) console.log(`No panel crop possible for ids: ${uncovered.join(', ')}`);
}
