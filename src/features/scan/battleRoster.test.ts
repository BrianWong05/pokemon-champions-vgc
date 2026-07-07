// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readBattleRoster, saveBattleRoster, clearBattleRoster, formFamilyIds, buildLegalIdsResolver } from './battleRoster';
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

describe('buildLegalIdsResolver', () => {
  const full = new Set([1, 2, 3]);
  const opp = new Set([6, 10034]);
  const mine = new Set([479, 10008]);

  it('both masks absent -> returns the SAME plain Set (identity parity)', () => {
    expect(buildLegalIdsResolver(full, null, null)).toBe(full);
  });

  it('battle mode: player tiles get my-team family, opponent tiles get roster family', () => {
    const r = buildLegalIdsResolver(full, opp, mine);
    expect(typeof r).toBe('function');
    const fn = r as (side: string | undefined, mode: string | null) => Set<number>;
    expect(fn('player', 'battle')).toBe(mine);
    expect(fn('opponent', 'battle')).toBe(opp);
  });

  it('team-preview and legacy paths always get the full set', () => {
    const fn = buildLegalIdsResolver(full, opp, mine) as (s: string | undefined, m: string | null) => Set<number>;
    expect(fn('opponent', 'team')).toBe(full);
    expect(fn('player', 'team')).toBe(full);
    expect(fn(undefined, null)).toBe(full);
  });

  it('one-sided masks fall back to full on the unmasked side', () => {
    const onlyOpp = buildLegalIdsResolver(full, opp, null) as (s: string | undefined, m: string | null) => Set<number>;
    expect(onlyOpp('player', 'battle')).toBe(full);
    expect(onlyOpp('opponent', 'battle')).toBe(opp);
    const onlyMine = buildLegalIdsResolver(full, null, mine) as (s: string | undefined, m: string | null) => Set<number>;
    expect(onlyMine('player', 'battle')).toBe(mine);
    expect(onlyMine('opponent', 'battle')).toBe(full);
  });
});
