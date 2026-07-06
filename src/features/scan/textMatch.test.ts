import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createCanvas } from 'canvas';
import { makeTextRenderer, matchTextShape, shapeFromMask } from './textMatch';

const render = makeTextRenderer((w, h) => createCanvas(w, h));

function bestKey(target: string, decoys: string[]): string | null {
  const shape = shapeFromMask(render(target));
  if (!shape) return null;
  const candidates = [target, ...decoys].map(label => ({ key: label, label }));
  return matchTextShape(shape, candidates, render)[0]?.key ?? null;
}

describe('textMatch self-render round trip', () => {
  it('en move names', () => {
    expect(bestKey('Protect', ['Parting Shot', 'Reflect', 'Light Screen', 'Foul Play'])).toBe('Protect');
    expect(bestKey('Light Screen', ['Light Clay', 'Reflect', 'Protect'])).toBe('Light Screen');
  });
  it('zh-Hant move names', () => {
    expect(bestKey('守住', ['拍落', '順風', '擊掌奇襲'])).toBe('守住');
    expect(bestKey('十萬伏特', ['流星群', '打草結', '急速折返'])).toBe('十萬伏特');
  });
  it('zh-Hans names', () => {
    expect(bestKey('拍击', ['空手劈', '连环巴掌', '百万吨重拳'])).toBe('拍击');
  });
  it('ja names', () => {
    expect(bestKey('まもる', ['はたきおとす', 'おいかぜ', 'ふいうち'])).toBe('まもる');
  });
  it('blank mask yields null shape', () => {
    expect(shapeFromMask({ bits: new Uint8Array(100), w: 10, h: 10 })).toBeNull();
  });
});

const GOLDEN_DIR = 'training/player-screens';
describe.skipIf(!fs.existsSync(GOLDEN_DIR))('golden text crops', () => {
  it('en-rental: every ability/item/move text matches top-1 among its slot candidates', async () => {
    const { loadPng } = await import('../../../scripts/hp-accuracy-core');
    const { detectPlayerPanels } = await import('./playerPanels');
    const { textShapeAt } = await import('./textMatch');
    const golden = JSON.parse(fs.readFileSync('training/player-golden.json', 'utf8'))['en-rental'];
    const img = loadPng(`${GOLDEN_DIR}/${golden.movesImage}`);
    const det = detectPlayerPanels(img)!;
    det.panels.forEach((panel, slot) => {
      const expected = golden.team[slot];
      // decoy pool: every other golden value of the same field type
      const allMoves = golden.team.flatMap((t: any) => t.moves);
      const check = (box: any, target: string, pool: string[]) => {
        const shape = textShapeAt(img, box);
        expect(shape, `${target} region has ink`).not.toBeNull();
        const cands = [...new Set([target, ...pool])].map(l => ({ key: l, label: l }));
        const top = matchTextShape(shape!, cands, render, 1)[0];
        expect(top?.key, `slot ${slot + 1}`).toBe(target);
      };
      check(panel.abilityText, expected.ability, golden.team.map((t: any) => t.ability));
      check(panel.itemText, expected.item, golden.team.map((t: any) => t.item));
      expected.moves.forEach((m: string, j: number) => check(panel.moveTexts![j], m, allMoves));
    });
  }, 300_000);
});
