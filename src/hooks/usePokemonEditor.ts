import { useReducer, useCallback, useEffect, useState } from 'react';
import { getDb } from '@/db';
import { pokemonAbilities, abilities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { PokemonPreset } from '@/utils/pokemon-presets';
import { getNatureStats, NATURES, getNatureFromStats, getFormattedNature } from '@/utils/pokemon-natures';
import { ParsedShowdownSet } from '@/utils/showdown-parser';

export interface PokemonConfig {
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
  nature: string;
  boostedStat: string | null;
  hinderedStat: string | null;
  moves: (MoveData | null)[];
  activeMoveIndex: number;
  abilities: string[];
  activeAbility: string | null;
  item: string | null;
  hpPercent: number;
  isTypeOverridden: boolean;
}

type PokemonAction =
  | { type: 'SET_SP', payload: { key: string, val: number } }
  | { type: 'SET_NATURE', payload: string }
  | { type: 'TOGGLE_NATURE', payload: { stat: string, mod: '+' | '-' } }
  | { type: 'SELECT_POKEMON', payload: { pokemon: PokemonBaseStats } }
  | { type: 'SELECT_MOVE_FOR_SLOT', payload: { index: number, move: MoveData } }
  | { type: 'CLEAR_MOVE_SLOT', payload: { index: number } }
  | { type: 'SET_ACTIVE_MOVE_SLOT', payload: { index: number } }
  | { type: 'SET_ABILITIES', payload: { abilities: string[] } }
  | { type: 'SET_ACTIVE_ABILITY', payload: { ability: string } }
  | { type: 'SET_ITEM', payload: { item: string | null } }
  | { type: 'SET_HP_PERCENT', payload: { val: number } }
  | { type: 'SET_TYPE', payload: { slot: 1 | 2, type: string | null } }
  | { type: 'TOGGLE_TYPE_OVERRIDE' }
  | { type: 'APPLY_PRESET', payload: { pokemon: PokemonBaseStats, abilities: string[], movesData: (MoveData | null)[], preset: any, natureStats: { boostedStat: string | null, hinderedStat: string | null } } }
  | { type: 'IMPORT_SHOWDOWN_SET', payload: { pokemon: PokemonBaseStats, abilities: string[], movesData: (MoveData | null)[], set: any, natureStats: { boostedStat: string | null, hinderedStat: string | null } } }
  | { type: 'LOAD_CONFIG', payload: PokemonConfig };

const initialPokemonState: PokemonConfig = {
  selectedId: null,
  type1: null,
  type2: null,
  baseHp: 100, baseAtk: 100, baseDef: 100, baseSpa: 100, baseSpd: 100, baseSpe: 100,
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
  nature: 'Hardy',
  boostedStat: null,
  hinderedStat: null,
  moves: [null, null, null, null],
  activeMoveIndex: 0,
  abilities: [],
  activeAbility: null,
  item: null,
  hpPercent: 100,
  isTypeOverridden: false,
};

function pokemonReducer(state: PokemonConfig, action: PokemonAction): PokemonConfig {
  switch (action.type) {
    case 'SET_SP': {
      const { key, val } = action.payload;
      return { ...state, [key]: val };
    }
    case 'SET_NATURE': {
      const stats = getNatureStats(action.payload);
      return { 
        ...state, 
        nature: action.payload, 
        boostedStat: stats.boostedStat, 
        hinderedStat: stats.hinderedStat 
      };
    }
    case 'TOGGLE_NATURE': {
      const { stat, mod } = action.payload;
      let newBoosted = state.boostedStat;
      let newHindered = state.hinderedStat;

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

      // We should probably find the nature name that matches this combo
      // For now, keep it simple and just update the stats.
      const newNature = getNatureFromStats(newBoosted, newHindered);
      return { ...state, boostedStat: newBoosted, hinderedStat: newHindered, nature: newNature };
    }
    case 'SELECT_POKEMON': {
      const { pokemon: p } = action.payload;
      return {
        ...state,
        selectedId: p.id,
        type1: p.type1,
        type2: p.type2,
        baseHp: p.baseHp,
        baseAtk: p.baseAttack,
        baseDef: p.baseDefense,
        baseSpa: p.baseSpAtk,
        baseSpd: p.baseSpDef,
        baseSpe: p.baseSpeed,
        boostedStat: null,
        hinderedStat: null,
        nature: 'Hardy',
        moves: [null, null, null, null],
        activeMoveIndex: 0,
        abilities: [],
        activeAbility: null,
        hpPercent: 100,
        isTypeOverridden: false,
        item: null,
      };
    }
    case 'SELECT_MOVE_FOR_SLOT': {
      const { index, move } = action.payload;
      const newMoves = [...state.moves];
      newMoves[index] = move;
      return { ...state, moves: newMoves, activeMoveIndex: index };
    }
    case 'CLEAR_MOVE_SLOT': {
      const { index } = action.payload;
      const newMoves = [...state.moves];
      newMoves[index] = null;
      return { ...state, moves: newMoves };
    }
    case 'SET_ACTIVE_MOVE_SLOT': {
      const { index } = action.payload;
      return { ...state, activeMoveIndex: index };
    }
    case 'SET_ABILITIES': {
      const { abilities } = action.payload;
      return {
        ...state,
        abilities,
        activeAbility: abilities[0] || null
      };
    }
    case 'SET_ACTIVE_ABILITY': {
      const { ability } = action.payload;
      return { ...state, activeAbility: ability };
    }
    case 'SET_ITEM': {
      const { item } = action.payload;
      return { ...state, item };
    }
    case 'SET_HP_PERCENT': {
      const { val } = action.payload;
      return { ...state, hpPercent: val };
    }
    case 'SET_TYPE': {
      const { slot, type } = action.payload;
      const typeKey = slot === 1 ? 'type1' : 'type2';
      return { ...state, [typeKey]: type };
    }
    case 'TOGGLE_TYPE_OVERRIDE': {
      return { ...state, isTypeOverridden: !state.isTypeOverridden };
    }
    case 'APPLY_PRESET': {
      const { pokemon: p, abilities, movesData, preset, natureStats } = action.payload;
      return {
        ...state,
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
        nature: getFormattedNature(preset.nature),
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
        hpPercent: 100,
        isTypeOverridden: false,
      };
    }
    case 'IMPORT_SHOWDOWN_SET': {
      const { pokemon: p, abilities, movesData, set, natureStats } = action.payload;
      return {
        ...state,
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
        nature: getFormattedNature(set.nature),
        moves: movesData,
        activeAbility: set.ability && abilities.includes(set.ability) ? set.ability : (abilities[0] || null),
        abilities: abilities,
        item: set.item,
        spHp: set.evs.hp,
        spAtk: set.evs.atk,
        spDef: set.evs.def,
        spSpa: set.evs.spa,
        spSpd: set.evs.spd,
        spSpe: set.evs.spe,
        hpPercent: 100,
        isTypeOverridden: false,
      };
    }
    case 'LOAD_CONFIG': {
      return {
        ...action.payload,
        nature: getFormattedNature(action.payload.nature)
      };
    }
    default: return state;
  }
}

export const usePokemonEditor = (initialConfig?: PokemonConfig) => {
  const [state, dispatch] = useReducer(pokemonReducer, initialConfig || initialPokemonState);

  const handleSelectPokemon = useCallback(async (p: PokemonBaseStats) => {
    dispatch({ type: 'SELECT_POKEMON', payload: { pokemon: p } });
    
    try {
      const db = await getDb();
      const abilityResult = await db.select({
        name: abilities.nameEn
      })
      .from(pokemonAbilities)
      .innerJoin(abilities, eq(pokemonAbilities.abilityId, abilities.id))
      .where(eq(pokemonAbilities.pokemonId, p.id))
      .orderBy(pokemonAbilities.slot);

      const abilityNames = abilityResult.map(a => a.name).filter((name): name is string => !!name);
      dispatch({ type: 'SET_ABILITIES', payload: { abilities: abilityNames } });
      return abilityNames;
    } catch (error) {
      console.error('Failed to fetch abilities:', error);
      return [];
    }
  }, []);

  const handleSelectPreset = useCallback(async (preset: PokemonPreset, pokemonList: PokemonBaseStats[], moveList: MoveData[]) => {
    const p = pokemonList.find(p => p.nameEn === preset.pokemonName);
    if (!p) return;
    
    let abilityNames: string[] = [];
    try {
      const db = await getDb();
      const abilityResult = await db.select({ name: abilities.nameEn })
        .from(pokemonAbilities)
        .innerJoin(abilities, eq(pokemonAbilities.abilityId, abilities.id))
        .where(eq(pokemonAbilities.pokemonId, p.id))
        .orderBy(pokemonAbilities.slot);
      abilityNames = abilityResult.map(a => a.name).filter((name): name is string => !!name);
    } catch (e) {
      console.error('Failed to fetch abilities for preset:', e);
    }

    const movesData = preset.moves.map(mName => moveList.find(m => m.nameEn === mName) || null);
    const natureStats = getNatureStats(preset.nature);

    while (movesData.length < 4) {
      movesData.push(null);
    }

    dispatch({
      type: 'APPLY_PRESET',
      payload: {
        pokemon: p,
        abilities: abilityNames,
        movesData: movesData.slice(0, 4),
        preset,
        natureStats
      }
    });
  }, []);

  const handleImportShowdown = useCallback(async (set: ParsedShowdownSet, pokemonList: PokemonBaseStats[], moveList: MoveData[]) => {
    const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const showdownNorm = normalizeName(set.species);
    
    let p = pokemonList.find(p => normalizeName(p.nameEn) === showdownNorm);

    if (!p) {
      const megaMatch = showdownNorm.match(/^([a-z]+)mega([xy])?$/);
      if (megaMatch) {
        const expectedDbMega = `mega${megaMatch[1]}${megaMatch[2] || ''}`;
        p = pokemonList.find(p => normalizeName(p.nameEn) === expectedDbMega);
      }
    }
    
    if (!p && showdownNorm === 'indeedeef') {
      p = pokemonList.find(p => normalizeName(p.nameEn) === 'indeedee');
    }

    if (!p) {
      const prefix = set.species.toLowerCase().split('-')[0];
      p = pokemonList.find(p => p.nameEn.toLowerCase() === prefix) || 
          pokemonList.find(p => p.nameEn.toLowerCase().includes(prefix));
    }

    if (!p) {
      alert(`Could not find Pokémon matching "${set.species}"`);
      return;
    }

    let abilityNames: string[] = [];
    try {
      const db = await getDb();
      const abilityResult = await db.select({ name: abilities.nameEn })
        .from(pokemonAbilities)
        .innerJoin(abilities, eq(pokemonAbilities.abilityId, abilities.id))
        .where(eq(pokemonAbilities.pokemonId, p.id))
        .orderBy(pokemonAbilities.slot);
      abilityNames = abilityResult.map(a => a.name).filter((name): name is string => !!name);
    } catch (e) {}

    const movesData = set.moves.map(mName => moveList.find(m => m.nameEn.toLowerCase() === mName.toLowerCase()) || null);
    while (movesData.length < 4) movesData.push(null);
    const natureStats = getNatureStats(set.nature);

    dispatch({
      type: 'IMPORT_SHOWDOWN_SET',
      payload: {
        pokemon: p,
        abilities: abilityNames,
        movesData: movesData.slice(0, 4),
        set,
        natureStats
      }
    });
  }, []);

  const setSp = useCallback((key: string, val: number) => {
    dispatch({ type: 'SET_SP', payload: { key, val } });
  }, []);

  const setNature = useCallback((nature: string) => {
    dispatch({ type: 'SET_NATURE', payload: nature });
  }, []);

  const toggleNature = useCallback((stat: string, mod: '+' | '-') => {
    dispatch({ type: 'TOGGLE_NATURE', payload: { stat, mod } });
  }, []);

  const setItem = useCallback((item: string | null) => {
    dispatch({ type: 'SET_ITEM', payload: { item } });
  }, []);

  const setAbility = useCallback((ability: string) => {
    dispatch({ type: 'SET_ACTIVE_ABILITY', payload: { ability } });
  }, []);

  const setMove = useCallback((index: number, move: MoveData) => {
    dispatch({ type: 'SELECT_MOVE_FOR_SLOT', payload: { index, move } });
  }, []);

  const clearMove = useCallback((index: number) => {
    dispatch({ type: 'CLEAR_MOVE_SLOT', payload: { index } });
  }, []);

  const setActiveMoveSlot = useCallback((index: number) => {
    dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { index } });
  }, []);

  const setHpPercent = useCallback((val: number) => {
    dispatch({ type: 'SET_HP_PERCENT', payload: { val } });
  }, []);

  const setType = useCallback((slot: 1 | 2, type: string | null) => {
    dispatch({ type: 'SET_TYPE', payload: { slot, type } });
  }, []);

  const toggleTypeOverride = useCallback(() => {
    dispatch({ type: 'TOGGLE_TYPE_OVERRIDE' });
  }, []);

  const loadConfig = useCallback((config: PokemonConfig) => {
    dispatch({ type: 'LOAD_CONFIG', payload: config });
  }, []);

  return {
    state,
    handleSelectPokemon,
    handleSelectPreset,
    handleImportShowdown,
    setSp,
    setNature,
    toggleNature,
    setItem,
    setAbility,
    setMove,
    clearMove,
    setActiveMoveSlot,
    setHpPercent,
    setType,
    toggleTypeOverride,
    loadConfig,
  };
};
