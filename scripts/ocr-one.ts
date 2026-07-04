// One-image OCR probe: run Tesseract.js over every plate of ONE capture, at
// every region-height/threshold/pipeline variant, printing everything it sees.
// Usage: npx tsx scripts/ocr-one.ts <image> [--raw]
import { PNG } from 'pngjs';
import * as path from 'path';
import { createWorker, PSM } from 'tesseract.js';
import { loadPng, battleView } from './hp-accuracy-core';
import { detectBattlePanels } from '../src/features/scan/battleDetection';
import {
  hpTextRegion, whiteMask, extractGlyphs, parseHpText, measureHpBarFill,
  GLYPH_PIPELINE_CONFIGS, MASK_THRESHOLDS, REGION_HEIGHT_FACTORS,
  type BinMask,
} from '../src/features/scan/hpText';

const SCALE = 4;

function maskToPngBuffer(mask: BinMask): Buffer {
  const png = new PNG({ width: mask.w * SCALE, height: mask.h * SCALE });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const on = mask.bits[Math.floor(y / SCALE) * mask.w + Math.floor(x / SCALE)];
      const i = (y * png.width + x) * 4;
      const v = on ? 0 : 255;
      png.data[i] = v; png.data[i + 1] = v; png.data[i + 2] = v; png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('usage: ocr-one.ts <image>');
  const img = battleView(loadPng(path.resolve(file)));
  const worker = await createWorker('eng');
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789%/',
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
  });

  for (const side of ['opponent', 'player'] as const) {
    const panels = detectBattlePanels(img, side);
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const bar = measureHpBarFill(img, panel);
      console.log(`--- ${side}[${i}] bar=${bar == null ? '-' : Math.round(bar * 100) + '%'}`);
      for (const hf of REGION_HEIGHT_FACTORS) {
        const region = hpTextRegion(panel, img, hf);
        if (region.w < 4 || region.h < 4) continue;
        for (const t of MASK_THRESHOLDS) {
          const raw = whiteMask(img, region, t);
          for (const config of GLYPH_PIPELINE_CONFIGS.slice(0, 2)) {
            const { mask } = extractGlyphs(raw, config);
            const { data } = await worker.recognize(maskToPngBuffer(mask));
            const text = data.text.replace(/\s+/g, '');
            if (!text) continue;
            const parsed = parseHpText(text);
            console.log(`  hf${hf} thr${t} shear${config.shear}: "${text}"${parsed ? `  => VALID ${parsed.percent}%` : ''}`);
          }
        }
      }
    }
  }
  await worker.terminate();
  console.log('done');
}

main();
