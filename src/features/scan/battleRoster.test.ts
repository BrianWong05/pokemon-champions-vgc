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
];

describe('battle roster store', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a roster and clears it', () => {
    saveBattleRoster([6, 479]);
    expect(readBattleRoster()).toEqual([6, 479]);
    clearBattleRoster();
    expect(readBattleRoster()).toBeNull();
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
});
