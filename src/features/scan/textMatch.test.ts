import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createCanvas } from 'canvas';
import {
  makeTextRenderer, matchTextShape, shapeFromMask,
  parseAtlas, composeAtlasMask, makeCellDecoder, matchTextAtlas, matchTextHybrid, ATLAS_ACCEPT,
} from './textMatch';

const render = makeTextRenderer((w, h) => createCanvas(w, h));

function bestKey(target: string, decoys: string[]): string | null {
  // stripIcon=false: this stands in for a rendered candidate label (no icon
  // ever prepended), not a screenshot crop — mirrors matchTextShape's own
  // render(c.label) call.
  const shape = shapeFromMask(render(target), false);
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

  // Regression: a real vocab probe (all moves/abilities/items x 4 langs) found
  // stripLeadingIcon's icon-gap heuristic (ICON_GAP=8) mistaking a short CJK
  // word's own inter-glyph gap for an icon separator, chewing off leading
  // characters. Confirmed pre-fix: rendering "火Ｚ" (Firium Z) through
  // shapeFromMask's default (stripIcon=true) strips down to bare "Ｚ",
  // making it byte-identical to "水Ｚ" (Waterium Z) — cols distance 0.
  // matchTextShape must render candidates with icon-stripping OFF so a
  // rendered word's own leading character always survives and the pair
  // stays disambiguated.
  it('short CJK words are not corrupted by the leading-icon strip', () => {
    // direct check: candidate-side shapes (as matchTextShape computes them)
    // must differ for confusable Z-crystal names.
    const fireZ = shapeFromMask(render('火Ｚ'), false)!;
    const waterZ = shapeFromMask(render('水Ｚ'), false)!;
    expect(fireZ).not.toEqual(waterZ);

    // end-to-end: matchTextShape must pick the correct one even against the
    // confusable decoys that share the stripped-down remainder.
    const observed = shapeFromMask(render('火Ｚ'), false)!;
    const candidates = ['火Ｚ', '水Ｚ', '電Ｚ', '草Ｚ'].map(l => ({ key: l, label: l }));
    expect(matchTextShape(observed, candidates, render)[0]?.key).toBe('火Ｚ');

    expect(bestKey('もうか', ['ちどりあし', 'とうそうしん', 'すりぬけ'])).toBe('もうか');
    expect(bestKey('とっしん', ['じしん', 'きりさく', 'てっぺき'])).toBe('とっしん');
  });
});

describe('glyph atlas cell decoding + hybrid matching', () => {
  // Hand-packed synthetic glyphs on a 32px line (hFrac ~1 like real text):
  // 'I' = 4x32 solid bar, 'O' = 8x32 ring, 'B' = 10x32 solid block. Pitch 12
  // keeps composed inter-cell gaps below the icon-strip threshold, like real
  // monospaced text.
  const atlasEntries = [
    { char: 'I', w: 4, h: 32, yOff: 0, hex: 'f'.repeat(32) },
    { char: 'O', w: 8, h: 32, yOff: 0, hex: 'ff' + '81'.repeat(30) + 'ff' },
    { char: 'B', w: 10, h: 32, yOff: 0, hex: 'f'.repeat(80) },
  ];
  const atlas = () => parseAtlas(atlasEntries, 12);

  it('parseAtlas decodes hex bits row-major, MSB first', () => {
    const g = atlas().glyphs.get('O')!;
    expect(g.w).toBe(8);
    expect(Array.from(g.bits.slice(0, 8))).toEqual([1, 1, 1, 1, 1, 1, 1, 1]); // top row
    expect(Array.from(g.bits.slice(8, 16))).toEqual([1, 0, 0, 0, 0, 0, 0, 1]); // ring row
  });

  it('composeAtlasMask returns null when any char is uncovered', () => {
    expect(composeAtlasMask(atlas(), 'IX')).toBeNull();
    expect(composeAtlasMask(atlas(), 'IB')).not.toBeNull();
  });

  it('decode: exact cells win with a near-perfect score; uncovered candidates are skipped', () => {
    const a = atlas();
    const crop = composeAtlasMask(a, 'IB')!;
    const decode = makeCellDecoder(crop, a);
    const candidates = [
      { key: 'bi', label: 'BI' },
      { key: 'ib', label: 'IB' },
      { key: 'p', label: 'Protect' }, // uncovered: never rankable by the atlas
    ];
    const ranked = matchTextAtlas(decode, candidates);
    expect(ranked[0].key).toBe('ib');
    expect(ranked[0].score).toBeGreaterThan(0.95);
    expect(ranked.map(r => r.key)).not.toContain('p');

    const shape = shapeFromMask(crop, false)!;
    const hybrid = matchTextHybrid(decode, shape, candidates, render);
    expect(hybrid).toEqual(ranked); // accept branch: atlas ranking wins
  });

  it('hybrid: falls back to canvas matching when no candidate is covered', () => {
    const a = atlas();
    const raw = render('Protect');
    const shape = shapeFromMask(raw, false)!;
    const candidates = ['Protect', 'Reflect'].map(l => ({ key: l, label: l }));
    const result = matchTextHybrid(makeCellDecoder(raw, a), shape, candidates, render);
    expect(result[0].key).toBe('Protect');
    expect(result).toEqual(matchTextShape(shape, candidates, render));
  });

  it('hybrid: falls back when the best atlas score is below the acceptance gate', () => {
    const a = atlas();
    const crop = render('Protect'); // latin canvas ink: nothing like bar/block glyphs
    const decode = makeCellDecoder(crop, a);
    const candidates = [
      { key: 'ib', label: 'IB' }, // covered but dissimilar: rankable, sub-gate
      { key: 'p', label: 'Protect' }, // uncovered: only reachable via fallback
    ];
    // Precondition: the covered candidate really is sub-threshold against
    // this crop — if calibration moves ATLAS_ACCEPT down this needs re-checking.
    const atlasTop = matchTextAtlas(decode, candidates)[0];
    expect(atlasTop?.key).toBe('ib');
    expect(atlasTop?.score).toBeLessThan(ATLAS_ACCEPT);
    const shape = shapeFromMask(crop, false)!;
    const result = matchTextHybrid(decode, shape, candidates, render);
    expect(result).toHaveLength(2); // atlas accept branch could only ever return 'ib'
    expect(result[0].key).toBe('p'); // canvas fallback ranks the true label first
  });

  it('hybrid: null decoder is plain shape matching', () => {
    const shape = shapeFromMask(render('Protect'), false)!;
    const candidates = ['Protect', 'Reflect'].map(l => ({ key: l, label: l }));
    expect(matchTextHybrid(null, shape, candidates, render))
      .toEqual(matchTextShape(shape, candidates, render));
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

describe.skipIf(!fs.existsSync(GOLDEN_DIR))('glyph atlas on golden crops', () => {
  // The crops pinned as text-match KNOWN_ISSUES / exceptions before the
  // atlas existed (scripts/player-scan-accuracy.test.ts): each must now rank
  // top-1 with atlas-level confidence against its full per-species vocabulary.
  // (ja slot1 moves 3/4: the original golden had Taunt/Light Screen swapped
  // vs the screen — fixed 2026-07-07 — so both rows are asserted here.)
  it('previously-failing zh/ja crops rank top-1 via the atlas pass', async () => {
    const { loadPng } = await import('../../../scripts/hp-accuracy-core');
    const { detectPlayerPanels } = await import('./playerPanels');
    const { buildVocabNode } = await import('../../../scripts/player-scan-core');
    const { candidatesForLang } = await import('@/db/repositories/scan.repo');
    const { whiteMask, MASK_THRESHOLDS } = await import('./hpText');
    const { TEXT_GLYPH_ATLAS, TEXT_GLYPH_PITCH } = await import('./textGlyphAtlas');
    const Database = (await import('better-sqlite3')).default;

    const db = new Database('vgc_pokemon.db', { readonly: true });
    const idOf = (n: string) => (db.prepare('SELECT id FROM pokemon WHERE name_en = ?').get(n) as any).id;
    const moveKey = (n: string) => String((db.prepare('SELECT id FROM moves WHERE name_en = ?').get(n) as any).id);
    const vocab = buildVocabNode();
    const atlas = parseAtlas(TEXT_GLYPH_ATLAS, TEXT_GLYPH_PITCH);

    const check = (img: any, box: any, lang: any, entries: any[], expectedKey: string, label: string) => {
      const decode = makeCellDecoder(MASK_THRESHOLDS.map((t: number) => whiteMask(img, box, t)), atlas);
      const result = matchTextAtlas(decode, candidatesForLang(entries, lang));
      expect(result[0]?.score, `${label}: atlas-pass confidence`).toBeGreaterThanOrEqual(ATLAS_ACCEPT);
      expect(result[0]?.key, label).toBe(expectedKey);
    };

    const zh = loadPng(`${GOLDEN_DIR}/zh-team17-moves.png`);
    const zhDet = detectPlayerPanels(zh)!;
    check(zh, zhDet.panels[2].moveTexts![2], 'zh-Hant', vocab.movesFor(idOf('Dragonite')), moveKey('Tailwind'), 'zh-team17 slot3 Tailwind');

    const ja = loadPng(`${GOLDEN_DIR}/ja-rental-r676-moves.png`);
    const jaDet = detectPlayerPanels(ja)!;
    check(ja, jaDet.panels[0].moveTexts![2], 'ja', vocab.movesFor(idOf('Grimmsnarl')), moveKey('Light Screen'), 'ja-rental slot1 row3 Light Screen');
    check(ja, jaDet.panels[0].moveTexts![3], 'ja', vocab.movesFor(idOf('Grimmsnarl')), moveKey('Taunt'), 'ja-rental slot1 row4 Taunt');
    check(ja, jaDet.panels[5].moveTexts![1], 'ja', vocab.movesFor(idOf('Gengar')), moveKey('Sludge Wave'), 'ja-rental slot6 Sludge Wave');
    check(ja, jaDet.panels[4].itemText!, 'ja', vocab.items, 'Delphoxite', 'ja-rental slot5 Delphoxite');
  }, 300_000);
});
