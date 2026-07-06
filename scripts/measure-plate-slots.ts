// scripts/measure-plate-slots.ts
// Prints each opponent plate's frame-fraction bounds on the native full-frame
// 2v2 golden screenshots — the source for gameRect's PLATE_SLOTS constants.
// Run: npx tsx scripts/measure-plate-slots.ts
import { detectBattlePanels } from '../src/features/scan/battleDetection';
import { loadPng, resolveGoldenPng } from './hp-accuracy-core';

const FRAMES = [
  'Xnip2026-07-01_03-26-01.png',
  'Xnip2026-07-01_19-38-20.png',
  'Xnip2026-07-01_05-34-16.png',
  'Xnip2026-07-01_18-08-40.png',
];
for (const f of FRAMES) {
  const img = loadPng(resolveGoldenPng(f, 'training/screenshots'));
  const panels = detectBattlePanels(img, 'opponent');
  panels.forEach((p, i) => {
    console.log(
      f, panels.length === 2 ? (i === 0 ? 'left ' : 'right') : 'only',
      'x0', (p.x / img.width).toFixed(3),
      'x1', ((p.x + p.w) / img.width).toFixed(3),
      'y0', (p.y / img.height).toFixed(3),
    );
  });
}
