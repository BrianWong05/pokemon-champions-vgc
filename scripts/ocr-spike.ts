// OCR A/B spike — VERDICT (2026-07-03): Tesseract.js ties/loses vs the glyph
// matcher on this font (raw mask: 19% recall/1 wrong; cleaned: 16%/1 wrong,
// vs matcher 50%/0 after threshold-diverse templates). Not adopted.
// To re-run: npm i -D tesseract.js && npx tsx scripts/ocr-spike.ts [--browser]
// OCR spike: Tesseract.js vs the golden set, with the same external
// validators the glyph reader uses (parse shape, 0%-guard, bar veto).
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import { createWorker, PSM } from 'tesseract.js';
import { loadPng, battleView, type GoldenFile } from './hp-accuracy-core';
import { detectBattlePanels } from '../src/features/scan/battleDetection';
import {
  hpTextRegion, whiteMask, parseHpText, measureHpBarFill, extractGlyphs, MASK_THRESHOLDS,
  GLYPH_PIPELINE_CONFIGS,
} from '../src/features/scan/hpText';
import type { BinMask } from '../src/features/scan/hpText';

const ROOT = path.resolve(__dirname, '..');
const SCALE = 4;

// Render a binary mask as BLACK text on WHITE (tesseract's preferred polarity),
// upscaled with nearest-neighbour.
function maskToPngBuffer(mask: BinMask): Buffer {
  const png = new PNG({ width: mask.w * SCALE, height: mask.h * SCALE });
  for (let y = 0; y < mask.h * SCALE; y++) {
    for (let x = 0; x < mask.w * SCALE; x++) {
      const on = mask.bits[Math.floor(y / SCALE) * mask.w + Math.floor(x / SCALE)];
      const i = (y * png.width + x) * 4;
      const v = on ? 0 : 255;
      png.data[i] = v; png.data[i + 1] = v; png.data[i + 2] = v; png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

async function main() {
  const dirArg = process.argv[2] === '--browser' ? 'training/hp-fixtures' : 'training/screenshots';
  const golden: GoldenFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'training/hp-golden.json'), 'utf8'));
  const worker = await createWorker('eng');
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789%/',
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
  });

  let readable = 0;
  let read = 0;
  let wrong = 0;
  for (const [name, entry] of Object.entries(golden)) {
    const img = battleView(loadPng(path.join(ROOT, dirArg, name)));
    for (const side of ['opponent', 'player'] as const) {
      const panels = detectBattlePanels(img, side);
      for (let i = 0; i < panels.length; i++) {
        const expected = entry[side][i];
        if (expected == null) continue;
        readable++;
        const panel = panels[i];
        const region = hpTextRegion(panel, img);
        if (region.w < 4 || region.h < 4) { console.log(`✗ ${name.slice(14, 22)} ${side[0]}${i} exp=${expected} (tiny region)`); continue; }
        const bar = measureHpBarFill(img, panel);
        let got: string | null = null;
        outer:
        for (const t of MASK_THRESHOLDS) {
          for (const config of GLYPH_PIPELINE_CONFIGS.slice(0, 3)) {
          const { mask } = extractGlyphs(whiteMask(img, region, t), config);
          const { data } = await worker.recognize(maskToPngBuffer(mask));
          const text = data.text.replace(/\s+/g, '');
          const reading = parseHpText(text);
          if (!reading || reading.percent === 0) continue;
          if (bar != null && Math.abs(reading.percent - bar * 100) > 35) continue;
          got = reading.current != null && reading.max != null ? `${reading.current}/${reading.max}` : `${reading.percent}%`;
          break outer;
          }
        }
        if (got === expected) read++;
        else if (got != null) wrong++;
        console.log(`${got === expected ? '✓' : got == null ? '✗' : '!!'} ${name.slice(14, 22)} ${side[0]}${i} exp=${expected} got=${got ?? '-'}`);
      }
    }
  }
  await worker.terminate();
  console.log(`\n[ocr ${dirArg.includes('fixtures') ? 'browser' : 'node'}] recall ${read}/${readable} (${Math.round((read / readable) * 100)}%) · wrong ${wrong}`);
}

main();
