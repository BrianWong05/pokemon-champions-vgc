// @vitest-environment jsdom
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArenaCalculatorLandscape } from './ArenaCalculatorLandscape';
import type { CalcState, SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import { koVerdictFromText } from '@/design-system/arena';

vi.mock('@/components/organisms/ShowdownImportModal', () => ({ default: () => null }));

// Same fixture pattern as useDamageScenarios.test.ts — if SideState has extra
// fields, copy defaults from useCalculatorState.ts's initial side object.
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

// Same fixture as useDamageScenarios.test.ts's baseState — its crit scenario
// deterministically produces a 'guaranteed OHKO' koChanceText (see that file's
// 'surfaces a koChanceText string on the crit scenario...' test).
const koState: CalcState = {
  weather: 'None', terrain: 'None', isSpreadTarget: false,
  isFairyAura: false, isDarkAura: false, isAuraBreak: false, isGravity: false,
  p1: side({
    selectedId: 987, type1: 'ghost', type2: 'fairy',
    baseHp: 55, baseAtk: 55, baseDef: 55, baseSpa: 135, baseSpd: 135, baseSpe: 135,
    spSpa: 32, boostedStat: 'spa', hinderedStat: 'atk', nature: 'Modest',
    moves: [mv('Moonblast'), null, null, null],
    abilities: ['Protosynthesis'], activeAbility: 'Protosynthesis',
  }),
  p2: side({
    selectedId: 887, type1: 'dragon', type2: 'ghost',
    baseHp: 88, baseAtk: 120, baseDef: 75, baseSpa: 100, baseSpd: 75, baseSpe: 142,
  }),
} as CalcState;

function setup() {
  const dispatch = vi.fn();
  render(
    <ArenaCalculatorLandscape
      state={state}
      dispatch={dispatch}
      pokemonList={pokemonList}
      moveList={[]}
      p1Results={p1Results}
      p2Results={[null, null, null, null]}
      p1MaxHp={162}
      p2MaxHp={195}
      actions={{ handleSelectPokemon: vi.fn(), handleSelectPreset: vi.fn(), handleImportShowdown: vi.fn(), handleLoadConfig: vi.fn() } as any}
      onApplySpread={vi.fn()}
      onResetBuild={vi.fn()}
      onOpenScan={vi.fn()}
    />,
  );
  return dispatch;
}

describe('ArenaCalculatorLandscape', () => {
  it('renders both side panels and per-move damage ranges', () => {
    setup();
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText('Opp')).toBeTruthy();
    // name also appears in the center readout's "X vs Y" line, so allow multiple
    expect(screen.getAllByText('Flutter Mane').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dragapult').length).toBeGreaterThanOrEqual(1);
    // move rows carry their own % ranges; the active move's range also shows in the readout
    expect(screen.getAllByText('78–92.1%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('64.2–75.6%').length).toBeGreaterThanOrEqual(1);
  });

  it('tapping a move row activates that slot', () => {
    const dispatch = setup();
    // the always-mounted (but closed) move-picker sheet also renders the move name;
    // the attacker panel's move row is first in DOM order
    fireEvent.click(screen.getAllByText('Shadow Ball')[0]);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p1', index: 1 } });
  });

  it('the center move header carries the Single/Spread target toggle', () => {
    const dispatch = setup();
    // the active move name shows in the header; the target toggle sits beside it
    expect(screen.getAllByText('Moonblast').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText('Spread'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SPREAD_TARGET', payload: true });
  });

  it('renders scenario rows in damage mode', () => {
    setup();
    expect(screen.getByText('Crit')).toBeTruthy();
    expect(screen.getByText('Opp. max bulk')).toBeTruthy();
    expect(screen.getByText('Opp. no SP')).toBeTruthy();
  });

  it('speed mode shows the comparison with outcomes', () => {
    setup();
    fireEvent.click(screen.getByText('Speed'));
    // Flutter Mane 205 vs Dragapult tiers: Max+ 213 outsped, Max 194 faster.
    // 205 shows in both the attacker stat card and the speed view's Actual button.
    expect(screen.getAllByText('205').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Outsped').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Faster').length).toBeGreaterThanOrEqual(1);
  });

  it('speed rank wheel dispatches SET_STAT_STAGE', () => {
    const dispatch = setup();
    fireEvent.click(screen.getByText('Speed'));
    // ArenaSpeedCompareView renders a "Spe rank" wheel per side; the "you" (attacker) column is first.
    const wheel = screen.getAllByLabelText('Spe rank')[0];
    vi.useFakeTimers();
    wheel.scrollTop = 7 * 28; // RANK_OPTIONS index 7 = stage +1
    fireEvent.scroll(wheel);
    act(() => { vi.advanceTimersByTime(150); });
    vi.useRealTimers();
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_STAT_STAGE', payload: { side: 'p1', stat: 'spe', val: 1 } });
  });

  it('swap direction reverses the matchup line and speed-view labels', () => {
    setup();
    // before swap: attacker Flutter Mane vs defender Dragapult
    const matchupBefore = screen.getByText(/vs/).textContent ?? '';
    expect(matchupBefore.indexOf('Flutter Mane')).toBeLessThan(matchupBefore.indexOf('Dragapult'));

    fireEvent.click(screen.getByLabelText('Swap direction'));

    const matchupAfter = screen.getByText(/vs/).textContent ?? '';
    expect(matchupAfter.indexOf('Dragapult')).toBeLessThan(matchupAfter.indexOf('Flutter Mane'));

    fireEvent.click(screen.getByText('Speed'));
    // after swap the attacker ("You") column of the speed view is now Dragapult
    expect(screen.getByText('You — Dragapult')).toBeTruthy();
  });

  it('renders an empty state without crashing when nothing is selected', () => {
    const emptySide = side({});
    const emptyState: CalcState = {
      weather: 'None', terrain: 'None', isSpreadTarget: false,
      isFairyAura: false, isDarkAura: false, isAuraBreak: false, isGravity: false,
      p1: emptySide, p2: emptySide,
    } as CalcState;
    const dispatch = vi.fn();
    render(
      <ArenaCalculatorLandscape
        state={emptyState}
        dispatch={dispatch}
        pokemonList={[]}
        moveList={[]}
        p1Results={[null, null, null, null]}
        p2Results={[null, null, null, null]}
        p1MaxHp={0}
        p2MaxHp={0}
        actions={{ handleSelectPokemon: vi.fn(), handleSelectPreset: vi.fn(), handleImportShowdown: vi.fn(), handleLoadConfig: vi.fn() } as any}
        onApplySpread={vi.fn()}
        onResetBuild={vi.fn()}
        onOpenScan={vi.fn()}
      />,
    );
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pick a move')).toBeTruthy();
  });

  it('each side panel surfaces its ability as a tappable pill', () => {
    // 7a dense-sheet layout has no collapse rails; ability shows as a pill per side.
    setup();
    expect(screen.getAllByText('Protosynthesis').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Infiltrator').length).toBeGreaterThanOrEqual(1);
  });

  it('a scenario with a real KO chance shows a matching verdict badge', () => {
    render(
      <ArenaCalculatorLandscape
        state={koState}
        dispatch={vi.fn()}
        pokemonList={pokemonList}
        moveList={[]}
        p1Results={[null, null, null, null]}
        p2Results={[null, null, null, null]}
        p1MaxHp={162}
        p2MaxHp={195}
        actions={{ handleSelectPokemon: vi.fn(), handleSelectPreset: vi.fn(), handleImportShowdown: vi.fn(), handleLoadConfig: vi.fn() } as any}
        onApplySpread={vi.fn()}
        onResetBuild={vi.fn()}
        onOpenScan={vi.fn()}
      />,
    );
    // koState's crit scenario deterministically yields 'guaranteed OHKO' (see fixture comment above).
    // The uninvested/no-SP scenarios also OHKO this frail defender, so the badge text can appear more than once.
    expect(screen.getAllByText(koVerdictFromText('guaranteed OHKO').verdict).length).toBeGreaterThanOrEqual(1);
  });

  it('typing a defender HP percent dispatches SET_HP_PERCENT', () => {
    const dispatch = setup();
    fireEvent.change(screen.getByLabelText('Defender HP percent'), { target: { value: '40' } });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: 40 } });
  });

  it('panels show computed stats; side effects live in Advanced; speed view has mode buttons', () => {
    setup();
    // stat block: the 'S' (Spe) label appears in the mono stat blocks
    expect(screen.getAllByText('S').length).toBeGreaterThanOrEqual(1);
    // side-effect toggles relocated to the (always-mounted) Advanced sheet — label "Helping hand"
    expect(screen.getAllByText('Helping hand').length).toBeGreaterThanOrEqual(1);
    // switching to speed exposes ArenaSpeedCompareView's mode buttons
    fireEvent.click(screen.getByText('Speed'));
    expect(screen.getByText('Scarf')).toBeTruthy();
  });
});
