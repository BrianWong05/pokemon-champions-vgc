// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useDamageScenarios } from './useDamageScenarios';
import type { CalcState, SideState } from './useCalculatorState';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';

// If SideState has fields beyond these, copy their defaults from
// useCalculatorState.ts's initial side object — the type-checker will flag them.
const side = (over: Partial<SideState>): SideState => ({
  selectedId: null, type1: null, type2: null, isTypeOverridden: false,
  baseHp: 0, baseAtk: 0, baseDef: 0, baseSpa: 0, baseSpd: 0, baseSpe: 0,
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
  nature: 'Serious', boostedStat: null, hinderedStat: null,
  stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: [null, null, null, null], activeMoveIndex: 0,
  movesForceCrit: [false, false, false, false], movesHits: [1, 1, 1, 1],
  abilities: [], activeAbility: null, item: null, hpPercent: 100,
  isReflect: false, isLightScreen: false, isAuroraVeil: false,
  isHelpingHand: false, isFriendGuard: false, isTailwind: false,
  faintedCount: 0, loadedFromScan: false,
  ...over,
} as SideState);

const moonblast = { nameEn: 'Moonblast', nameZh: null, typeId: 18 } as unknown as MoveData;

const flutterMane = side({
  selectedId: 987, baseHp: 55, baseAtk: 55, baseDef: 55, baseSpa: 135, baseSpd: 135, baseSpe: 135,
  spSpa: 32, boostedStat: 'spa', hinderedStat: 'atk', nature: 'Modest',
  moves: [moonblast, null, null, null], abilities: ['Protosynthesis'], activeAbility: 'Protosynthesis',
});
const dragapult = side({
  selectedId: 887, baseHp: 88, baseAtk: 120, baseDef: 75, baseSpa: 100, baseSpd: 75, baseSpe: 142,
});

const baseState: CalcState = {
  weather: 'None', terrain: 'None', isSpreadTarget: false,
  isFairyAura: false, isDarkAura: false, isAuraBreak: false, isGravity: false,
  p1: flutterMane, p2: dragapult,
} as CalcState;

const pokemonList = [
  { id: 987, nameEn: 'Flutter Mane', nameZh: null, type1: 'ghost', type2: 'fairy' },
  { id: 887, nameEn: 'Dragapult', nameZh: null, type1: 'dragon', type2: 'ghost' },
] as unknown as PokemonBaseStats[];

describe('useDamageScenarios', () => {
  it('returns nulls when no move is selected', () => {
    const s = { ...baseState, p1: side({ ...flutterMane, moves: [null, null, null, null] }) };
    const { result } = renderHook(() => useDamageScenarios(s, pokemonList, 'p1'));
    expect(result.current).toEqual({ crit: null, maxBulk: null, noSp: null });
  });

  it('crit deals more than the uninvested baseline; max bulk deals less', () => {
    const { result } = renderHook(() => useDamageScenarios(baseState, pokemonList, 'p1'));
    const { crit, maxBulk, noSp } = result.current;
    expect(crit && maxBulk && noSp).toBeTruthy();
    // defender has 0 SP, so noSp equals the current spread's damage
    expect(crit!.minPercent).toBeGreaterThan(noSp!.minPercent);
    expect(maxBulk!.maxPercent).toBeLessThan(noSp!.maxPercent);
    expect(noSp!.maxPercent).toBeGreaterThan(0);
  });

  it('noSp exceeds the current spread when the defender is invested', () => {
    const bulky = { ...baseState, p2: side({ ...dragapult, spHp: 32, spSpd: 32 }) };
    const { result: invested } = renderHook(() => useDamageScenarios(bulky, pokemonList, 'p1'));
    const { result: base } = renderHook(() => useDamageScenarios(baseState, pokemonList, 'p1'));
    expect(invested.current.noSp!.maxPercent).toBeGreaterThanOrEqual(base.current.maxBulk!.maxPercent);
    expect(invested.current.noSp!.maxPercent).toBeGreaterThan(invested.current.maxBulk!.maxPercent);
  });

  it('invests bulk in the defending stat that matches the move category', () => {
    // Moonblast is special; give the defender high Def / low SpD so bulk must
    // land in SpD — if the category were swapped, maxBulk would barely drop.
    const asym = {
      ...baseState,
      p2: side({ selectedId: 887, baseHp: 88, baseAtk: 120, baseDef: 150, baseSpa: 100, baseSpd: 40, baseSpe: 142 }),
    };
    const { result } = renderHook(() => useDamageScenarios(asym, pokemonList, 'p1'));
    const { maxBulk, noSp } = result.current;
    expect(maxBulk && noSp).toBeTruthy();
    expect(maxBulk!.maxPercent).toBeLessThan(noSp!.maxPercent * 0.75);
  });
});
