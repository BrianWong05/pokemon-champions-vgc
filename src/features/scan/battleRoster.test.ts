// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readBattleRoster, saveBattleRoster, clearBattleRoster, formFamilyIds } from './battleRoster';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const mon = (id: number, identifier: string): PokemonBaseStats =>
  ({ id, identifier, nameEn: identifier, nameZh: null, type1: 'normal', type2: null,
     baseHp: 1, baseAttack: 1, baseDefense: 1, baseSpAtk: 1, baseSpDef: 1, baseSpeed: 1 } as PokemonBaseStats);

const LIST = [
  mon(6, 'charizard'), mon(10034, 'charizard-mega-x'), mon(10035, 'charizard-mega-y'),
  mon(479, 'rotom'), mon(10008, 'rotom-heat'),
  mon(137, 'porygon'), mon(474, 'porygon-z'),
  mon(122, 'mr-mime'), mon(10168, 'mr-mime-galar'),
  mon(964, 'palafin-zero'), mon(10256, 'palafin-hero'),
  mon(678, 'meowstic-male'), mon(10314, 'meowstic-mega'),
];

describe('battle roster store', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a roster and clears it', () => {
    saveBattleRoster([6, 479]);
    expect(readBattleRoster()).toEqual([6, 479]);
    clearBattleRoster();
    expect(readBattleRoster()).toBeNull();
  });

  it('dedupes ids before writing', () => {
    saveBattleRoster([6, 6, 479]);
    expect(readBattleRoster()).toEqual([6, 479]);
  });

  it('rejects empty saves and treats corrupt values as no roster', () => {
    saveBattleRoster([]);
    expect(readBattleRoster()).toBeNull();
    localStorage.setItem('scan.battleRoster', '{not json');
    expect(readBattleRoster()).toBeNull();
    localStorage.setItem('scan.battleRoster', '["a","b"]');
    expect(readBattleRoster()).toBeNull();
  });
});

describe('formFamilyIds', () => {
  it('expands a base species to its full form family', () => {
    expect([...formFamilyIds([6], LIST)].sort((a, b) => a - b)).toEqual([6, 10034, 10035]);
  });

  it('a form id resolves back to its base and expands the family', () => {
    expect([...formFamilyIds([10008], LIST)].sort((a, b) => a - b)).toEqual([479, 10008]);
  });

  it('hyphenated base identifiers expand correctly (mr-mime trap)', () => {
    expect([...formFamilyIds([122], LIST)].sort((a, b) => a - b)).toEqual([122, 10168]);
  });

  it('never sweeps a different base species in via prefix (porygon vs porygon-z)', () => {
    expect(formFamilyIds([137], LIST).has(474)).toBe(false);
  });

  it('unknown ids pass through unexpanded', () => {
    expect([...formFamilyIds([9999], LIST)]).toEqual([9999]);
  });

  it('a base identifier with a default-form suffix still finds its form (palafin-zero)', () => {
    expect([...formFamilyIds([964], LIST)].sort((a, b) => a - b)).toEqual([964, 10256]);
  });

  it('a form resolves back to a suffixed base (palafin-hero -> palafin-zero)', () => {
    expect([...formFamilyIds([10256], LIST)].sort((a, b) => a - b)).toEqual([964, 10256]);
  });

  it('a base identifier with a default-form suffix still finds its form (meowstic-male)', () => {
    expect([...formFamilyIds([678], LIST)].sort((a, b) => a - b)).toEqual([678, 10314]);
  });
});
