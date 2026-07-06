import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import type { RgbaImage } from './types';
import { detectPlayerPanels, classifyScreenKind, carveRegions } from './playerPanels';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const i = (yy * img.width + xx) * 4;
    img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
  }
}

const PURPLE: [number, number, number] = [168, 156, 224];  // panel body tone
const ORANGE: [number, number, number] = [240, 150, 50];   // stat bar tone

function paintSixPanels(img: RgbaImage) {
  // 2 cols x 3 rows on a 1280x720 canvas, panel 480x120
  const boxes = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const x = 100 + c * 560, y = 150 + r * 170;
    fillRect(img, x, y, 480, 120, PURPLE);
    boxes.push({ x, y, w: 480, h: 120 });
  }
  return boxes;
}

describe('detectPlayerPanels', () => {
  it('finds 6 panels in slot order', () => {
    const img = blank(1280, 720);
    paintSixPanels(img);
    const det = detectPlayerPanels(img);
    expect(det).not.toBeNull();
    expect(det!.panels).toHaveLength(6);
    // slot order: row-major — slot 0 top-left, slot 1 top-right, slot 2 mid-left...
    expect(det!.panels[0].panel.x).toBeLessThan(det!.panels[1].panel.x);
    expect(det!.panels[0].panel.y).toBeCloseTo(det!.panels[1].panel.y, -1);
    expect(det!.panels[2].panel.y).toBeGreaterThan(det!.panels[0].panel.y);
  });

  it('returns null when fewer than 6 panels', () => {
    const img = blank(1280, 720);
    fillRect(img, 100, 150, 480, 120, PURPLE);
    expect(detectPlayerPanels(img)).toBeNull();
  });

  it('ignores a spurious oversized purple blob instead of displacing a real panel', () => {
    const img = blank(1400, 900);
    const boxes = paintSixPanels(img);
    // Intruder: wider than a real panel (still passes aspect 2-6 and width>=22% filters),
    // and larger in area than every real panel (480*120 = 57600).
    const intruder = { x: 100, y: 700, w: 700, h: 130 };
    fillRect(img, intruder.x, intruder.y, intruder.w, intruder.h, PURPLE);
    const det = detectPlayerPanels(img);
    if (det) {
      expect(det.panels).toHaveLength(6);
      const panelBoxes = det.panels.map(p => p.panel);
      // every returned box must match one of the 6 true panels
      for (const b of boxes) {
        expect(panelBoxes.some(p => p.x === b.x && p.y === b.y && p.w === b.w && p.h === b.h)).toBe(true);
      }
      // the intruder must never appear in the result
      expect(panelBoxes.some(p => p.x === intruder.x && p.y === intruder.y && p.w === intruder.w && p.h === intruder.h)).toBe(false);
    } else {
      expect(det).toBeNull();
    }
  });

  it('returns null when 6 similarly-sized blobs do not form a 2x3 grid', () => {
    const img = blank(1400, 900);
    // 6 boxes that all pass area/aspect/width filters but are scattered, not a clean grid.
    const scattered = [
      { x: 100, y: 100, w: 480, h: 120 },
      { x: 700, y: 160, w: 480, h: 120 },
      { x: 100, y: 400, w: 480, h: 120 },
      { x: 750, y: 420, w: 480, h: 120 },
      { x: 120, y: 650, w: 480, h: 120 },
      { x: 680, y: 700, w: 480, h: 120 },
    ];
    for (const b of scattered) fillRect(img, b.x, b.y, b.w, b.h, PURPLE);
    expect(detectPlayerPanels(img)).toBeNull();
  });

  it('classifies stats screen by orange bars', () => {
    const img = blank(1280, 720);
    const boxes = paintSixPanels(img);
    for (const b of boxes) fillRect(img, b.x + 200, b.y + 50, 60, 6, ORANGE);
    expect(classifyScreenKind(img, boxes)).toBe('stats');
  });

  it('classifies moves screen when no bars', () => {
    const img = blank(1280, 720);
    const boxes = paintSixPanels(img);
    expect(classifyScreenKind(img, boxes)).toBe('moves');
  });

  it('carves 4 move rows and 6 stat cells', () => {
    const panel = { x: 0, y: 0, w: 480, h: 120 };
    expect(carveRegions(panel, 'moves').moveTexts).toHaveLength(4);
    expect(carveRegions(panel, 'stats').statCells).toHaveLength(6);
  });
});

const GOLDEN_DIR = 'training/player-screens';
describe.skipIf(!fs.existsSync(GOLDEN_DIR))('golden screenshots', () => {
  const cases: Array<[string, 'moves' | 'stats']> = [
    ['en-rental-moves.png', 'moves'], ['en-rental-stats.png', 'stats'],
    ['zh-team17-moves.png', 'moves'], ['zh-team17-stats.png', 'stats'],
  ];
  for (const [file, kind] of cases) {
    it(`detects 6 ${kind} panels in ${file}`, async () => {
      const { loadPng } = await import('../../../scripts/hp-accuracy-core');
      const det = detectPlayerPanels(loadPng(`${GOLDEN_DIR}/${file}`));
      expect(det?.kind).toBe(kind);
      expect(det?.panels).toHaveLength(6);
    }, 60_000);
  }

  // Extended sweep (controller deviation 2): every moves+stats pair from
  // MANIFEST.md — 12 pairs / 24 files. None excluded; all detect 6 panels
  // with the correct kind against the calibrated constants above.
  const manifestPairs = [
    'en-rental', 'en-rental-kw8u', 'zh-team17', 'zh-team14', 'zh-team13',
    'zh-team3', 'zh-rental-m7tq', 'ja-rental-qqnh', 'ja-rental-r676',
    'ja-team3', 'ja-select-banx', 'ja-team7',
  ];
  const sweepCases: Array<[string, 'moves' | 'stats']> = manifestPairs.flatMap(
    (base): Array<[string, 'moves' | 'stats']> => [
      [`${base}-moves.png`, 'moves'],
      [`${base}-stats.png`, 'stats'],
    ],
  );
  for (const [file, kind] of sweepCases) {
    it(`sweep: detects 6 ${kind} panels in ${file}`, async () => {
      const { loadPng } = await import('../../../scripts/hp-accuracy-core');
      const det = detectPlayerPanels(loadPng(`${GOLDEN_DIR}/${file}`));
      expect(det?.kind).toBe(kind);
      expect(det?.panels).toHaveLength(6);
    }, 60_000);
  }
});
