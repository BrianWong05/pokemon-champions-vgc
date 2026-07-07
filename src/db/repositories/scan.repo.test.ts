import { describe, it, expect } from 'vitest';
import { buildPlayerScanVocab, candidatesForLang } from './scan.repo';

const rows = {
  moves: [
    { id: 1, nameEn: 'Pound', nameJa: 'はたく', nameZh: '拍擊', nameZhHans: '拍击' },
    { id: 182, nameEn: 'Protect', nameJa: 'まもる', nameZh: '守住', nameZhHans: '守住' },
  ],
  learnset: [{ pokemonId: 25, moveId: 182 }],
  abilities: [{ pokemonId: 25, nameEn: 'Static', nameJa: 'せいでんき', nameZh: '靜電', nameZhHans: '静电' }],
  items: [
    { nameEn: 'Leftovers', nameJa: 'たべのこし', nameZh: '吃剩的東西', nameZhHans: '吃剩的东西' },
    { nameEn: 'Definitely Not A Real Item', nameJa: null, nameZh: null, nameZhHans: null },
  ],
};

describe('buildPlayerScanVocab', () => {
  const vocab = buildPlayerScanVocab(rows);
  it('learnset lookup', () => {
    expect(vocab.movesFor(25).map(m => m.moveId)).toEqual([182]);
    expect(vocab.movesFor(999)).toEqual([]);
  });
  it('abilities lookup', () => {
    expect(vocab.abilitiesFor(25)[0].key).toBe('Static');
  });
  it('items filtered to legal vocabulary', () => {
    const names = vocab.items.map(i => i.key);
    expect(names).toContain('Leftovers');
    expect(names).not.toContain('Definitely Not A Real Item');
  });
  it('candidatesForLang: language selection with en fallback', () => {
    const zh = candidatesForLang(vocab.movesFor(25), 'zh-Hant');
    expect(zh).toEqual([{ key: '182', label: '守住' }]);
    const en = candidatesForLang(vocab.items, 'en');
    expect(en.find(c => c.key === 'Leftovers')?.label).toBe('Leftovers');
  });
});
