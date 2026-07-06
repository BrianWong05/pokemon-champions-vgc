import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import type { RgbaImage } from './types';
import { scanPlayerImage } from './scanPlayerFrame';
import { buildPlayerScanVocab } from '@/db/repositories/scan.repo';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const i = (yy * img.width + xx) * 4;
    img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
  }
}

// Darker than playerPanels.test.ts's PURPLE: min-channel must stay below
// whiteMask's 120 floor so a blank (glyph-free) text region reads as no ink.
const PURPLE: [number, number, number] = [110, 100, 150];  // panel body tone

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

const vocab = buildPlayerScanVocab({
  moves: [{ id: 182, nameEn: 'Protect', nameJa: 'まもる', nameZh: '守住', nameZhHans: '守住' }],
  learnset: [{ pokemonId: 7, moveId: 182 }],
  abilities: [{ pokemonId: 7, nameEn: 'Torrent', nameJa: null, nameZh: null, nameZhHans: null }],
  items: [],
});

const fakeDeps = {
  loadRefs: async () => [],
  loadClassifier: async () => null,
  matchTile: () => [{ id: 7, score: 0.9 }],
  cropImage: (img: RgbaImage) => img,
  render: () => ({ bits: new Uint8Array(0), w: 0, h: 0 }),
};

describe('scanPlayerImage', () => {
  it('returns null when no panels', async () => {
    expect(await scanPlayerImage(blank(200, 200), new Set([7]), vocab, fakeDeps)).toBeNull();
  });
  it('moves screen: 6 panels with species from descriptor fallback', async () => {
    const img = blank(1280, 720);
    paintSixPanels(img);
    const scan = await scanPlayerImage(img, new Set([7]), vocab, fakeDeps);
    expect(scan?.kind).toBe('moves');
    expect(scan?.panels).toHaveLength(6);
    if (scan?.kind === 'moves') {
      expect(scan.panels[0].species[0]?.id).toBe(7);
      expect(scan.panels[0].moves).toHaveLength(4);
      // blank text regions (renderer/mask yields no ink) → null fields
      expect(scan.panels[0].ability).toBeNull();
    }
  });
});

const GOLDEN_DIR = 'training/player-screens';
describe.skipIf(!fs.existsSync(GOLDEN_DIR))('golden full-frame scans', () => {
  it('en-rental moves image: species + per-field en top-1 all correct', async () => {
    const { loadPng } = await import('../../../scripts/hp-accuracy-core');
    const { nodeScanDeps, buildVocabNode } = await import('../../../scripts/player-scan-core');
    const golden = JSON.parse(fs.readFileSync('training/player-golden.json', 'utf8'))['en-rental'];
    const img = loadPng(`${GOLDEN_DIR}/${golden.movesImage}`);
    const db = (await import('better-sqlite3')).default('vgc_pokemon.db', { readonly: true }) as any;
    const idByName = (n: string) => (db.prepare('SELECT id FROM pokemon WHERE name_en = ?').get(n) as any)?.id;
    const moveName = (id: string) => (db.prepare('SELECT name_en FROM moves WHERE id = ?').get(Number(id)) as any)?.name_en;
    const legalIds = new Set<number>(golden.team.map((t: any) => idByName(t.species)));
    const scan = await scanPlayerImage(img, legalIds, buildVocabNode(), nodeScanDeps);
    expect(scan?.kind).toBe('moves');
    if (scan?.kind !== 'moves') return;
    scan.panels.forEach((panel, slot) => {
      const expected = golden.team[slot];
      expect(panel.species[0]?.id, `slot ${slot + 1} species`).toBe(idByName(expected.species));
      expect(panel.ability?.byLang.en[0]?.key).toBe(expected.ability);
      expect(panel.item?.byLang.en[0]?.key).toBe(expected.item);
      expected.moves.forEach((m: string, j: number) => {
        expect(moveName(panel.moves[j]!.byLang.en[0]!.key), `slot ${slot + 1} move ${j + 1}`).toBe(m);
      });
    });
  }, 600_000);
});
