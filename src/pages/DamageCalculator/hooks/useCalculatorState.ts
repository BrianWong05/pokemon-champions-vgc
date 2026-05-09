import { useReducer } from 'react';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { getNatureStats, getNatureFromStats, getFormattedNature } from '@/utils/pokemon-natures';
import { ParsedShowdownSet } from '@/utils/showdown-parser';
import { AEGISLASH_ID } from '@/hooks/usePokemonEditor';

export interface SideState {
  selectedId: number | null;
  type1: string | null;
  type2: string | null;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpa: number;
  baseSpd: number;
  baseSpe: number;
  spHp: number;
  spAtk: number;
  spDef: number;
  spSpa: number;
  spSpd: number;
  spSpe: number;
  boostedStat: string | null;
  hinderedStat: string | null;
  nature: string;
  stages: Record<string, number>;
  moves: (MoveData | null)[];
  activeMoveIndex: number;
  abilities: string[];
  activeAbility: string | null;
  hpPercent: number;
  isTypeOverridden: boolean;
  item: string | null;
  isReflect: boolean;
  isLightScreen: boolean;
  isAuroraVeil: boolean;
  isHelpingHand: boolean;
  isFriendGuard: boolean;
  isTailwind: boolean;
  movesForceCrit: boolean[];
  movesHits: number[];
  faintedCount: number;
  form?: 'Shield' | 'Blade';
}

export interface CalcState {
  p1: SideState;
  p2: SideState;
  weather: 'None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow';
  terrain: 'None' | 'Electric' | 'Grassy' | 'Misty' | 'Psychic';
  isSpreadTarget: boolean;
  isFairyAura: boolean;
  isDarkAura: boolean;
  isAuraBreak: boolean;
  isGravity: boolean;
}

export type CalcAction = 
  | { type: 'SET_SP', payload: { side: 'p1' | 'p2', key: string, val: number } }
  | { type: 'SET_NATURE', payload: { side: 'p1' | 'p2', nature: string } }
  | { type: 'TOGGLE_NATURE', payload: { side: 'p1' | 'p2', stat: string, mod: '+' | '-' } }
  | { type: 'SET_STAT_STAGE', payload: { side: 'p1' | 'p2', stat: string, val: number } }
  | { type: 'SET_MOVE_POWER', payload: { side: 'p1' | 'p2', val: number } }
  | { type: 'SET_MOVE_CATEGORY', payload: { side: 'p1' | 'p2', val: 'physical' | 'special' } }
  | { type: 'SELECT_POKEMON', payload: { side: 'p1' | 'p2', pokemon: PokemonBaseStats } }
  | { type: 'SELECT_MOVE_FOR_SLOT', payload: { side: 'p1' | 'p2', index: number, move: MoveData } }
  | { type: 'CLEAR_MOVE_SLOT', payload: { side: 'p1' | 'p2', index: number } }
  | { type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p1' | 'p2', index: number } }
  | { type: 'SET_ABILITIES', payload: { side: 'p1' | 'p2', abilities: string[] } }
  | { type: 'SET_ACTIVE_ABILITY', payload: { side: 'p1' | 'p2', ability: string } }
  | { type: 'SET_ITEM', payload: { side: 'p1' | 'p2', item: string | null } }
  | { type: 'TOGGLE_SIDE_EFFECT', payload: { side: 'p1' | 'p2', effect: 'isReflect' | 'isLightScreen' | 'isAuroraVeil' | 'isHelpingHand' | 'isFriendGuard' | 'isTailwind' } }
  | { type: 'TOGGLE_MOVE_CRIT', payload: { side: 'p1' | 'p2', index: number } }
  | { type: 'SET_MOVE_HITS', payload: { side: 'p1' | 'p2', index: number, val: number } }
  | { type: 'SET_WEATHER', payload: 'None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow' }
  | { type: 'SET_TERRAIN', payload: 'None' | 'Electric' | 'Grassy' | 'Misty' | 'Psychic' }
  | { type: 'SET_SPREAD_TARGET', payload: boolean }
  | { type: 'SET_HP_PERCENT', payload: { side: 'p1' | 'p2', val: number } }
  | { type: 'TOGGLE_FIELD_AURA', payload: 'isFairyAura' | 'isDarkAura' | 'isAuraBreak' }
  | { type: 'TOGGLE_GRAVITY' }
  | { type: 'SET_TYPE', payload: { side: 'p1' | 'p2', slot: 1 | 2, type: string | null } }
  | { type: 'TOGGLE_TYPE_OVERRIDE', payload: { side: 'p1' | 'p2' } }
  | { type: 'TOGGLE_AEGISLASH_FORM', payload: { side: 'p1' | 'p2' } }
  | { type: 'APPLY_PRESET', payload: { side: 'p1' | 'p2', pokemon: PokemonBaseStats, abilities: string[], movesData: (MoveData | null)[], preset: any, natureStats: { boostedStat: string | null, hinderedStat: string | null } } }
  | { type: 'IMPORT_SHOWDOWN_SET', payload: { side: 'p1' | 'p2', pokemon: PokemonBaseStats, abilities: string[], movesData: (MoveData | null)[], set: any, natureStats: { boostedStat: string | null, hinderedStat: string | null } } }
  | { type: 'LOAD_CONFIG', payload: { side: 'p1' | 'p2', config: any, pokemon: PokemonBaseStats, abilities: string[], movesData: (MoveData | null)[], natureStats: { boostedStat: string | null, hinderedStat: string | null } } }
  | { type: 'SET_FAINTED_COUNT', payload: { side: 'p1' | 'p2', val: number } };

export const initialSide: SideState = {
  selectedId: null,
  type1: null,
  type2: null,
  baseHp: 100, baseAtk: 100, baseDef: 100, baseSpa: 100, baseSpd: 100, baseSpe: 100,
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
  boostedStat: null,
  hinderedStat: null,
  nature: 'Hardy',
  stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: [null, null, null, null],
  activeMoveIndex: 0,
  abilities: [],
  activeAbility: null,
  hpPercent: 100,
  isTypeOverridden: false,
  item: null,
  isReflect: false,
  isLightScreen: false,
  isAuroraVeil: false,
  isHelpingHand: false,
  isFriendGuard: false,
  isTailwind: false,
  movesForceCrit: [false, false, false, false],
  movesHits: [3, 3, 3, 3],
  faintedCount: 0,
};

export const initialState: CalcState = {
  p1: { ...initialSide, spAtk: 32, spSpa: 32 },
  p2: initialSide,
  weather: 'None',
  terrain: 'None',
  isSpreadTarget: false,
  isFairyAura: false,
  isDarkAura: false,
  isAuraBreak: false,
  isGravity: false,
};

export function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'SET_ITEM': {
      const { side, item } = action.payload;
      return { ...state, [side]: { ...state[side], item } };
    }
    case 'SET_NATURE': {
      const { side, nature } = action.payload;
      const stats = getNatureStats(nature);
      return { 
        ...state, 
        [side]: { 
          ...state[side], 
          nature, 
          boostedStat: stats.boostedStat, 
          hinderedStat: stats.hinderedStat 
        } 
      };
    }
    case 'TOGGLE_SIDE_EFFECT': {
      const { side, effect } = action.payload;
      return { ...state, [side]: { ...state[side], [effect]: !state[side][effect] } };
    }
    case 'TOGGLE_MOVE_CRIT': {
      const { side, index } = action.payload;
      const current = state[side];
      const newMovesForceCrit = [...current.movesForceCrit];
      newMovesForceCrit[index] = !newMovesForceCrit[index];
      return { ...state, [side]: { ...current, movesForceCrit: newMovesForceCrit } };
    }
    case 'SET_MOVE_HITS': {
      const { side, index, val } = action.payload;
      const current = state[side];
      const newMovesHits = [...current.movesHits];
      newMovesHits[index] = val;
      return { ...state, [side]: { ...current, movesHits: newMovesHits } };
    }
    case 'SET_SP': {
      const { side, key, val } = action.payload;
      return { ...state, [side]: { ...state[side], [key]: val } };
    }
    case 'TOGGLE_NATURE': {
      const { side, stat, mod } = action.payload;
      const current = state[side];
      let newBoosted = current.boostedStat;
      let newHindered = current.hinderedStat;

      if (mod === '+') {
        if (newBoosted === stat) {
          newBoosted = null;
        } else {
          newBoosted = stat;
          if (newHindered === stat) newHindered = null;
        }
      } else {
        if (newHindered === stat) {
          newHindered = null;
        } else {
          newHindered = stat;
          if (newBoosted === stat) newBoosted = null;
        }
      }

      const newNature = getNatureFromStats(newBoosted, newHindered);
      return { ...state, [side]: { ...current, boostedStat: newBoosted, hinderedStat: newHindered, nature: newNature } };
    }
    case 'SET_STAT_STAGE': {
      const { side, stat, val } = action.payload;
      const newStages = { ...state[side].stages, [stat]: Math.min(6, Math.max(-6, val)) };
      return { ...state, [side]: { ...state[side], stages: newStages } };
    }
    case 'SELECT_POKEMON': {
      const { side, pokemon: p } = action.payload;
      return {
        ...state,
        [side]: {
          ...initialSide,
          selectedId: p.id,
          type1: p.type1,
          type2: p.type2,
          baseHp: p.baseHp,
          baseAtk: p.baseAttack,
          baseDef: p.baseDefense,
          baseSpa: p.baseSpAtk,
          baseSpd: p.baseSpDef,
          baseSpe: p.baseSpeed,
          spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
          boostedStat: null,
          hinderedStat: null,
          stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          moves: [null, null, null, null],
          activeMoveIndex: 0,
          abilities: [],
          activeAbility: null,
          hpPercent: 100,
          nature: 'Hardy',
          movesHits: [3, 3, 3, 3],
          form: p.id === AEGISLASH_ID ? 'Shield' : undefined,
        }
      };
    }
    case 'TOGGLE_AEGISLASH_FORM': {
      const { side } = action.payload;
      const current = state[side];
      if (current.selectedId !== AEGISLASH_ID) return state;
      const newForm = current.form === 'Shield' ? 'Blade' : 'Shield';
      return {
        ...state,
        [side]: {
          ...current,
          form: newForm,
          baseAtk: current.baseDef,
          baseDef: current.baseAtk,
          baseSpa: current.baseSpd,
          baseSpd: current.baseSpa,
        }
      };
    }
    case 'SELECT_MOVE_FOR_SLOT': {
      const { side, index, move } = action.payload;
      const newMoves = [...state[side].moves];
      newMoves[index] = move;
      return { ...state, [side]: { ...state[side], moves: newMoves, activeMoveIndex: index } };
    }
    case 'CLEAR_MOVE_SLOT': {
      const { side, index } = action.payload;
      const newMoves = [...state[side].moves];
      newMoves[index] = null;
      return { ...state, [side]: { ...state[side], moves: newMoves } };
    }
    case 'SET_ACTIVE_MOVE_SLOT': {
      const { side, index } = action.payload;
      return { ...state, [side]: { ...state[side], activeMoveIndex: index } };
    }
    case 'SET_ABILITIES': {
      const { side, abilities } = action.payload;
      return {
        ...state,
        [side]: {
          ...state[side],
          abilities,
          activeAbility: abilities[0] || null
        }
      };
    }
    case 'SET_ACTIVE_ABILITY': {
      const { side, ability } = action.payload;
      return { ...state, [side]: { ...state[side], activeAbility: ability } };
    }
    case 'SET_WEATHER': return { ...state, weather: action.payload };
    case 'SET_TERRAIN': return { ...state, terrain: action.payload };
    case 'SET_SPREAD_TARGET': return { ...state, isSpreadTarget: action.payload };
    case 'SET_HP_PERCENT': {
      const { side, val } = action.payload;
      return { ...state, [side]: { ...state[side], hpPercent: val } };
    }
    case 'TOGGLE_FIELD_AURA': return { ...state, [action.payload]: !state[action.payload] };
    case 'TOGGLE_GRAVITY': return { ...state, isGravity: !state.isGravity };
    case 'SET_TYPE': {
      const { side, slot, type } = action.payload;
      const typeKey = slot === 1 ? 'type1' : 'type2';
      return { ...state, [side]: { ...state[side], [typeKey]: type } };
    }
    case 'TOGGLE_TYPE_OVERRIDE': {
      const { side } = action.payload;
      return { ...state, [side]: { ...state[side], isTypeOverridden: !state[side].isTypeOverridden } };
    }
    case 'APPLY_PRESET': {
      const { side, pokemon: p, abilities, movesData, preset, natureStats } = action.payload;
      return {
        ...state,
        [side]: {
          ...initialSide,
          selectedId: p.id,
          type1: p.type1,
          type2: p.type2,
          baseHp: p.baseHp,
          baseAtk: p.baseAttack,
          baseDef: p.baseDefense,
          baseSpa: p.baseSpAtk,
          baseSpd: p.baseSpDef,
          baseSpe: p.baseSpeed,
          boostedStat: natureStats.boostedStat,
          hinderedStat: natureStats.hinderedStat,
          stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          moves: movesData,
          activeMoveIndex: 0,
          abilities: abilities,
          activeAbility: preset.ability && abilities.includes(preset.ability) ? preset.ability : (abilities[0] || null),
          item: preset.item,
          spHp: preset.sp.hp,
          spAtk: preset.sp.atk,
          spDef: preset.sp.def,
          spSpa: preset.sp.spa,
          spSpd: preset.sp.spd,
          spSpe: preset.sp.spe,
          nature: getFormattedNature(preset.nature),
          hpPercent: 100,
          movesHits: [3, 3, 3, 3],
          form: p.id === AEGISLASH_ID ? 'Shield' : undefined,
        }
      }
    }
    case 'IMPORT_SHOWDOWN_SET': {
      const { side, pokemon: p, abilities, movesData, set, natureStats } = action.payload;
      return {
        ...state,
        [side]: {
          ...initialSide,
          selectedId: p.id,
          type1: p.type1,
          type2: p.type2,
          baseHp: p.baseHp,
          baseAtk: p.baseAttack,
          baseDef: p.baseDefense,
          baseSpa: p.baseSpAtk,
          baseSpd: p.baseSpDef,
          baseSpe: p.baseSpeed,
          boostedStat: natureStats.boostedStat,
          hinderedStat: natureStats.hinderedStat,
          stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          moves: movesData,
          activeMoveIndex: 0,
          abilities: abilities,
          activeAbility: set.ability && abilities.includes(set.ability) ? set.ability : (abilities[0] || null),
          item: set.item,
          spHp: set.evs.hp,
          spAtk: set.evs.atk,
          spDef: set.evs.def,
          spSpa: set.evs.spa,
          spSpd: set.evs.spd,
          spSpe: set.evs.spe,
          nature: getFormattedNature(set.nature),
          hpPercent: 100,
          movesHits: [3, 3, 3, 3],
          form: p.id === AEGISLASH_ID ? 'Shield' : undefined,
        }
      }
    }
    case 'LOAD_CONFIG': {
      const { side, config, pokemon: p, abilities, movesData, natureStats } = action.payload;
      const baseAtk = config.baseAtk ?? p.baseAttack;
      const baseDef = config.baseDef ?? p.baseDefense;
      const baseSpa = config.baseSpa ?? p.baseSpAtk;
      const baseSpd = config.baseSpd ?? p.baseSpDef;

      return {
        ...state,
        [side]: {
          ...initialSide,
          selectedId: p.id,
          type1: config.type1 ?? p.type1,
          type2: config.type2 ?? p.type2,
          baseHp: config.baseHp ?? p.baseHp,
          baseAtk,
          baseDef,
          baseSpa,
          baseSpd,
          baseSpe: config.baseSpe ?? p.baseSpeed,
          boostedStat: natureStats.boostedStat,
          hinderedStat: natureStats.hinderedStat,
          stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          moves: movesData,
          activeMoveIndex: 0,
          abilities: abilities,
          activeAbility: config.activeAbility,
          item: config.item,
          spHp: config.spHp,
          spAtk: config.spAtk,
          spDef: config.spDef,
          spSpa: config.spSpa,
          spSpd: config.spSpd,
          spSpe: config.spSpe,
          nature: getFormattedNature(config.nature),
          hpPercent: 100,
          movesHits: [3, 3, 3, 3],
          isTypeOverridden: config.isTypeOverridden || false,
          form: config.form || (p.id === AEGISLASH_ID ? 'Shield' : undefined),
        }
      }
    }
    case 'SET_FAINTED_COUNT': {
      const { side, val } = action.payload;
      return { ...state, [side]: { ...state[side], faintedCount: val } };
    }
    default: return state;
  }
}

export function useCalculatorState() {
  const [state, dispatch] = useReducer(calcReducer, initialState);
  return { state, dispatch };
}