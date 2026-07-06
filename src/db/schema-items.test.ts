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
  it('public copy is in sync', () => {
    const pub = new Database('public/vgc_pokemon.db', { readonly: true });
    const a = db.prepare('SELECT COUNT(*) AS c FROM items').get() as any;
    const b = pub.prepare('SELECT COUNT(*) AS c FROM items').get() as any;
    expect(a.c).toBe(b.c);
  });
});
