// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArenaCalculator } from './ArenaCalculator';
import type { CalcState, SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';

vi.mock('@/components/organisms/ShowdownImportModal', () => ({ default: () => null }));

// Same fixture pattern as arena-calculator-landscape.test.tsx.
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

const mv = (nameEn: string, typeId = 18) => ({ nameEn, nameZh: null, typeId } as unknown as MoveData);

const state: CalcState = {
  weather: 'None', terrain: 'None', isSpreadTarget: false,
  isFairyAura: false, isDarkAura: false, isAuraBreak: false, isGravity: false,
  p1: side({
    selectedId: 987, type1: 'ghost', type2: 'fairy',
    baseHp: 55, baseAtk: 55, baseDef: 55, baseSpa: 135, baseSpd: 135, baseSpe: 135,
    spSpa: 32, spSpe: 32, boostedStat: 'spe', hinderedStat: 'atk', nature: 'Timid',
    moves: [mv('Moonblast'), mv('Shadow Ball', 8), null, null],
    abilities: ['Protosynthesis'], activeAbility: 'Protosynthesis',
  }),
  p2: side({
    selectedId: 887, type1: 'dragon', type2: 'ghost',
    baseHp: 88, baseAtk: 120, baseDef: 75, baseSpa: 100, baseSpd: 75, baseSpe: 142,
    abilities: ['Infiltrator'], activeAbility: 'Infiltrator',
  }),
} as CalcState;

const pokemonList = [
  { id: 987, nameEn: 'Flutter Mane', nameZh: null, type1: 'ghost', type2: 'fairy' },
  { id: 887, nameEn: 'Dragapult', nameZh: null, type1: 'dragon', type2: 'ghost' },
] as unknown as PokemonBaseStats[];

const res = (moveName: string, minPercent: number, maxPercent: number): DamageResult => ({
  minDamage: 100, maxDamage: 120, minPercent, maxPercent, moveName, moveNameZh: null,
  moveType: 18, originalType: 18, isStab: false, effectiveness: 2, koChanceText: 'guaranteed 2HKO',
} as DamageResult);

const p1Results = [res('Moonblast', 78, 92.1), res('Shadow Ball', 64.2, 75.6), null, null];

const calcProps = {
  state,
  dispatch: vi.fn(),
  pokemonList,
  moveList: [],
  p1Results,
  p2Results: [null, null, null, null],
  p1MaxHp: 162,
  p2MaxHp: 195,
  actions: { handleSelectPokemon: vi.fn(), handleSelectPreset: vi.fn(), handleImportShowdown: vi.fn(), handleLoadConfig: vi.fn() } as any,
  onApplySpread: vi.fn(),
  onResetBuild: vi.fn(),
  onOpenScan: vi.fn(),
};

describe('ArenaCalculator (portrait)', () => {
  it('toggling to Speed shows the stacked speed compare (Scarf mode button)', () => {
    render(<ArenaCalculator {...calcProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Speed' }));
    expect(screen.getByText('Scarf')).toBeTruthy();
  });

  it('attacker card shows a per-move percent for each move, not just the active one', () => {
    render(<ArenaCalculator {...calcProps} />);
    // The (always-mounted-but-closed) move picker sheet already renders every
    // move's percent once, so a single-match assertion wouldn't discriminate.
    // Before this change the attacker row is a single "Move" SelectRow, so the
    // inactive move's percent (Shadow Ball, 64.2–75.6%) appears only in the
    // sheet (1 match); after this change ArenaMonCard's ArenaMoveList renders
    // it too (2 matches).
    expect(screen.getAllByText('64.2–75.6%').length).toBe(2);
  });
});
