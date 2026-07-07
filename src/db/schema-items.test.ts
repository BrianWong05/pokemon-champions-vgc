import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';

const db = new Database('vgc_pokemon.db', { readonly: true });

describe('localized scan data', () => {
  it('moves have zh-Hans names', () => {
    const row = db.prepare("SELECT name_zh_hans FROM moves WHERE name_en = 'Pound'").get() as any;
    expect(row?.name_zh_hans).toBe('拍击');
  });
  it('abilities have zh-Hans names', () => {
    const row = db.prepare("SELECT name_zh_hans FROM abilities WHERE name_en = 'Prankster'").get() as any;
    expect(row?.name_zh_hans).toBe('恶作剧之心');
  });
  it('items table exists with localized names', () => {
    const row = db.prepare("SELECT name_ja, name_zh, name_zh_hans FROM items WHERE name_en = 'Leftovers'").get() as any;
    expect(row?.name_zh).toBe('吃剩的東西');
    expect(row?.name_zh_hans).toBe('吃剩的东西');
    expect(row?.name_ja).toBeTruthy();
  });
  it('Champions mega stones are present with synthesized zh names', () => {
    const row = db.prepare("SELECT name_zh FROM items WHERE name_en = 'Dragoninite'").get() as any;
    expect(row?.name_zh).toBe('快龍進化石');
  });
  it('Scrafty stone is Scraftinite (Bulbapedia spelling), not Scraftite', () => {
    const row = db.prepare("SELECT name_ja, name_zh FROM items WHERE name_en = 'Scraftinite'").get() as any;
    expect(row?.name_zh).toBe('頭巾混混進化石');
    expect(row?.name_ja).toBe('ズルズキナイト'); // ズルズキン drops ン (Bulbapedia); the old row had ズルズキンナイト
    expect(db.prepare("SELECT 1 FROM items WHERE name_en = 'Scraftite'").get()).toBeUndefined();
  });
  it('Champions mega stones have synthesized ja names', () => {
    // Delphoxite is a MANUAL_JA override, not plain synthesis: the game
    // elides the trailing long-vowel mark (マフォクシー -> マフォクシナイト),
    // confirmed against the ja-rental-r676 golden screenshot by same-font
    // glyph composition (scripts/build-text-glyph-atlas.ts, 2026-07-07).
    const row = db.prepare("SELECT name_ja FROM items WHERE name_en = 'Delphoxite'").get() as any;
    expect(row?.name_ja).toBe('マフォクシナイト');
    // and an actually-synthesized one keeps the plain speciesJa + ナイト form
    const syn = db.prepare("SELECT name_ja FROM items WHERE name_en = 'Pidgeotite'").get() as any;
    expect(syn?.name_ja).toBe('ピジョットナイト');
  });
  it('newly added Legends Z-A / Champions stones present with Bulbapedia-confirmed names', () => {
    // All fields verified against Bulbapedia; some also confirmed on training/player-screens/.
    const barb = db.prepare("SELECT name_en, name_ja, name_zh FROM items WHERE name_en = 'Barbaracite'").get() as any;
    expect(barb?.name_en).toBe('Barbaracite');
    expect(barb?.name_ja).toBe('ガメノデスナイト');
    expect(barb?.name_zh).toBe('龜足巨鎧進化石');

    // full-width Ｙ suffix, matching Charizardite Y (リザードナイトＹ) in this table
    const raichu = db.prepare("SELECT name_ja, name_zh FROM items WHERE name_en = 'Raichunite Y'").get() as any;
    expect(raichu?.name_ja).toBe('ライチュウナイトＹ');
    expect(raichu?.name_zh).toBe('雷丘進化石Ｙ');

    // ドラミドロ contracts to ドラミド before ナイト (not ドラミドロナイト)
    const dragalge = db.prepare("SELECT name_ja, name_zh FROM items WHERE name_en = 'Dragalgite'").get() as any;
    expect(dragalge?.name_ja).toBe('ドラミドナイト');
    expect(dragalge?.name_zh).toBe('毒藻龍進化石');
  });
  it('Z-A audit stones present, incl. final-mora contraction and gender-suffix cases', () => {
    // Bulbapedia-confirmed. Found by auditing pokemon_forms(is_mega) against the stone list.
    const expected: Record<string, [string, string]> = {
      'Raichunite X': ['ライチュウナイトＸ', '雷丘進化石Ｘ'],
      'Falinksite': ['タイレーツナイト', '列陣兵進化石'],
      'Scolipite': ['ペンドラナイト', '蜈蚣王進化石'], // ペンドラー -> ペンドラ (drop ー)
      'Eelektrossite': ['シビルドナイト', '麻麻鰻魚王進化石'], // シビルドン -> シビルド (drop ン)
      'Malamarite': ['カラマネナイト', '烏賊王進化石'], // カラマネロ -> カラマネ (drop ロ)
      'Pyroarite': ['カエンジシナイト', '火炎獅進化石'], // Pyroar row carries a " (Male)" suffix, stripped
    };
    for (const [name, [ja, zh]] of Object.entries(expected)) {
      const row = db.prepare('SELECT name_ja, name_zh FROM items WHERE name_en = ?').get(name) as any;
      expect(row?.name_ja, name).toBe(ja);
      expect(row?.name_zh, name).toBe(zh);
    }
  });
  it('full 92-stone set: exotic megas, Mega Z variants, and form-suffix species', () => {
    // Completes the set to Bulbapedia's 92 Mega Stones. Verified against Bulbapedia.
    const expected: Record<string, [string, string]> = {
      'Heatranite': ['ヒードラナイト', '席多藍恩進化石'], // ヒードラン -> ヒードラ (drop ン)
      'Magearnite': ['マギアナイト', '瑪機雅娜進化石'], // マギアナ -> マギア (existing ナ-elision)
      'Staraptite': ['ムクホークナイト', '姆克鷹進化石'],
      'Tatsugirinite': ['シャリタツナイト', '米立龍進化石'], // Tatsugiri row has a " (Curly)" suffix, stripped
      'Zygardite': ['ジガルデナイト', '基格爾德進化石'], // Zygarde row has a " (50)" suffix, stripped
      'Absolite Z': ['アブソルナイトＺ', '阿勃梭魯進化石Ｚ'], // Mega Z form, full-width Ｚ suffix
      'Garchompite Z': ['ガブリアスナイトＺ', '烈咬陸鯊進化石Ｚ'],
      'Lucarionite Z': ['ルカリオナイトＺ', '路卡利歐進化石Ｚ'],
    };
    for (const [name, [ja, zh]] of Object.entries(expected)) {
      const row = db.prepare('SELECT name_ja, name_zh FROM items WHERE name_en = ?').get(name) as any;
      expect(row?.name_ja, name).toBe(ja);
      expect(row?.name_zh, name).toBe(zh);
    }
  });
  it('public copy is in sync', () => {
    const pub = new Database('public/vgc_pokemon.db', { readonly: true });
    const a = db.prepare('SELECT COUNT(*) AS c FROM items').get() as any;
    const b = pub.prepare('SELECT COUNT(*) AS c FROM items').get() as any;
    expect(a.c).toBe(b.c);
  });
});
