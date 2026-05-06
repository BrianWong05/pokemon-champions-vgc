import React, { useReducer, useMemo, useEffect, useState } from 'react';
import DamageCalculatorTemplate from '@/components/templates/DamageCalculatorTemplate';
import PokemonPanel from '@/components/organisms/PokemonPanel';
import ResultsPanel, { DamageResult } from '@/components/organisms/ResultsPanel';
import { calculateHP, calculateStat, calculateSmogonDamage, mapToSmogonPokemon, mapToSmogonField, mapToSmogonMove } from '@/utils/damage';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, moves, pokemonAbilities, abilities } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { fetchTypeEfficacy, calculateEffectiveness, TypeEfficacyMap } from '@/utils/type-effectiveness';
import { TYPE_IDS, REVERSE_TYPE_IDS } from '@/utils/pokemon-types';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { POKEMON_PRESETS, PokemonPreset, getNatureStats } from '@/utils/pokemon-presets';

interface SideState {
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
}

interface CalcState {
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

type CalcAction = 
  | { type: 'SET_SP', payload: { side: 'p1' | 'p2', key: string, val: number } }
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
  | { type: 'APPLY_PRESET', payload: { side: 'p1' | 'p2', pokemon: PokemonBaseStats, abilities: string[], movesData: (MoveData | null)[], preset: any, natureStats: { boostedStat: string | null, hinderedStat: string | null } } };

const initialSide: SideState = {
  selectedId: null,
  type1: null,
  type2: null,
  baseHp: 100, baseAtk: 100, baseDef: 100, baseSpa: 100, baseSpd: 100, baseSpe: 100,
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
  boostedStat: null,
  hinderedStat: null,
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
};

const initialState: CalcState = {
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

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'SET_ITEM': {
      const { side, item } = action.payload;
      return { ...state, [side]: { ...state[side], item } };
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
    case 'SET_WEATHER':
      return { ...state, weather: action.payload };
    case 'SET_TERRAIN':
      return { ...state, terrain: action.payload };
    case 'SET_SPREAD_TARGET':
      return { ...state, isSpreadTarget: action.payload };
    case 'TOGGLE_FIELD_AURA':
      return { ...state, [action.payload]: !state[action.payload] };
    case 'TOGGLE_GRAVITY':
      return { ...state, isGravity: !state.isGravity };
    case 'SET_TYPE': {
      const { side, slot, type } = action.payload;
      const typeKey = slot === 1 ? 'type1' : 'type2';
      return { ...state, [side]: { ...state[side], [typeKey]: type } };
    }
    case 'TOGGLE_TYPE_OVERRIDE': {
      const { side } = action.payload;
      return { ...state, [side]: { ...state[side], isTypeOverridden: !state[side].isTypeOverridden } };
    }
    case 'SET_HP_PERCENT': {
      const { side, val } = action.payload;
      return { ...state, [side]: { ...state[side], hpPercent: val } };
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

      return { ...state, [side]: { ...state[side], boostedStat: newBoosted, hinderedStat: newHindered } };
    }
    case 'SET_STAT_STAGE': {
      const { side, stat, val } = action.payload;
      const clampedVal = Math.min(6, Math.max(-6, val));
      return {
        ...state,
        [side]: {
          ...state[side],
          stages: { ...state[side].stages, [stat]: clampedVal }
        }
      };
    }
    case 'SET_MOVE_POWER': {
      const { side, val } = action.payload;
      const newMoves = [...state[side].moves];
      const activeMove = newMoves[state[side].activeMoveIndex];
      if (activeMove) {
        newMoves[state[side].activeMoveIndex] = { ...activeMove, power: val };
      }
      return { ...state, [side]: { ...state[side], moves: newMoves } };
    }
    case 'SET_MOVE_CATEGORY': {
      const { side, val } = action.payload;
      const newMoves = [...state[side].moves];
      const activeMove = newMoves[state[side].activeMoveIndex];
      if (activeMove) {
        newMoves[state[side].activeMoveIndex] = { ...activeMove, damageClassId: val === 'physical' ? 2 : 3 };
      }
      return { ...state, [side]: { ...state[side], moves: newMoves } };
    }
    case 'SELECT_POKEMON': {
      const { side, pokemon: p } = action.payload;
      return {
        ...state,
        [side]: {
          ...state[side],
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
          stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          moves: [null, null, null, null],
          activeMoveIndex: 0,
          abilities: [],
          activeAbility: null,
          hpPercent: 100,
          movesHits: [3, 3, 3, 3]
        }
      };
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
      return {
        ...state,
        [side]: {
          ...state[side],
          activeAbility: ability
        }
      };
    }
    case 'SELECT_MOVE_FOR_SLOT': {
      const { side, index, move } = action.payload;
      const newMoves = [...state[side].moves];
      newMoves[index] = move;
      return { 
        ...state, 
        [side]: { 
          ...state[side], 
          moves: newMoves, 
          activeMoveIndex: index 
        } 
      };
    }
    case 'CLEAR_MOVE_SLOT': {
      const { side, index } = action.payload;
      const newMoves = [...state[side].moves];
      newMoves[index] = null;
      return { 
        ...state, 
        [side]: { 
          ...state[side], 
          moves: newMoves 
        } 
      };
    }
    case 'SET_ACTIVE_MOVE_SLOT': {
      const { side, index } = action.payload;
      return { 
        ...state, 
        [side]: { 
          ...state[side], 
          activeMoveIndex: index 
        } 
      };
    }
    case 'APPLY_PRESET': {
      const { side, pokemon: p, abilities, movesData, preset, natureStats } = action.payload;
      return {
        ...state,
        [side]: {
          ...state[side],
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
          hpPercent: 100,
          movesHits: [3, 3, 3, 3]
        }
      }
    }
    default: return state;
  }
}

const DamageCalculatorPage: React.FC = () => {
  const [state, dispatch] = useReducer(calcReducer, initialState);
  const [pokemonList, setPokemonList] = useState<PokemonBaseStats[]>([]);
  const [moveList, setMoveList] = useState<MoveData[]>([]);
  const [efficacyMap, setEfficacyMap] = useState<TypeEfficacyMap>({});

  const handleSelectPokemon = async (side: 'p1' | 'p2', p: PokemonBaseStats) => {
    dispatch({ type: 'SELECT_POKEMON', payload: { side, pokemon: p } });
    
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
      dispatch({ type: 'SET_ABILITIES', payload: { side, abilities: abilityNames } });
      return abilityNames;
    } catch (error) {
      console.error('Failed to fetch abilities:', error);
      return [];
    }
  };

  const handleSelectPreset = async (side: 'p1' | 'p2', preset: PokemonPreset) => {
    const p = pokemonList.find(p => p.nameEn === preset.pokemonName);
    if (!p) return;
    
    // We need abilities from DB first to ensure the active ability is set correctly if it's in the list
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

    // Provide default empty arrays if moves list is short
    while (movesData.length < 4) {
      movesData.push(null);
    }

    dispatch({
      type: 'APPLY_PRESET',
      payload: {
        side,
        pokemon: p,
        abilities: abilityNames,
        movesData: movesData.slice(0, 4),
        preset,
        natureStats
      }
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = await getDb();
        const [pokeResult, efficacyResult, moveResult] = await Promise.all([
          db.select({
            id: pokemon.id,
            identifier: pokemon.identifier,
            nameEn: pokemon.nameEn,
            nameZh: pokemon.nameZh,
            type1: pokemon.type1,
            type2: pokemon.type2,
            baseHp: pokemon.baseHp,
            baseAttack: pokemon.baseAttack,
            baseDefense: pokemon.baseDefense,
            baseSpAtk: pokemon.baseSpAtk,
            baseSpDef: pokemon.baseSpDef,
            baseSpeed: pokemon.baseSpeed,
          })
          .from(pokemon)
          .innerJoin(formatPokemon, eq(pokemon.id, formatPokemon.pokemonId))
          .innerJoin(formats, eq(formatPokemon.formatId, formats.id))
          .where(eq(formats.name, 'Regulation M-A')),
          fetchTypeEfficacy(),
          db.select().from(moves)
        ]);
        
        setPokemonList(pokeResult as PokemonBaseStats[]);
        setEfficacyMap(efficacyResult);
        setMoveList(moveResult as MoveData[]);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };
    fetchData();
  }, []);

  const p1MaxHp = useMemo(() => calculateHP(state.p1.baseHp, state.p1.spHp), [state.p1]);
  const p2MaxHp = useMemo(() => calculateHP(state.p2.baseHp, state.p2.spHp), [state.p2]);

  const computeResults = (attacker: SideState, defender: SideState, defMaxHp: number) => {
    return attacker.moves.map((moveData, moveIdx) => {
      if (!moveData) return null;

      const atkBase = pokemonList.find(p => p.id === attacker.selectedId);
      const defBase = pokemonList.find(p => p.id === defender.selectedId);
      
      // If pokemon aren't selected yet, we can't calculate properly
      if (!atkBase || !defBase) return null;

      const attackerPokemon = mapToSmogonPokemon(attacker, atkBase.nameEn, atkBase.type1, atkBase.type2);
      const defenderPokemon = mapToSmogonPokemon(defender, defBase.nameEn, defBase.type1, defBase.type2);
      const field = mapToSmogonField(
        state.weather, 
        state.isSpreadTarget, 
        state.isFairyAura, 
        state.isDarkAura, 
        state.isAuraBreak, 
        state.terrain, 
        state.isGravity,
        attacker,
        defender
      );
      const isCrit = attacker.movesForceCrit[moveIdx];
      const hits = attacker.movesHits[moveIdx];
      const move = mapToSmogonMove(moveData.nameEn, isCrit, hits);

      const result = calculateSmogonDamage(attackerPokemon, defenderPokemon, move, field);
      
      console.log(`[DEBUG Calc] ${attackerPokemon.name} vs ${defenderPokemon.name} with ${move.name}`, {
        resultDamage: result.damage,
        attackerStats: attackerPokemon.stats,
        defenderStats: defenderPokemon.stats,
        move: move.name,
        field: field.weather
      });

      const damageArr = Array.isArray(result.damage) ? result.damage : [result.damage || 0];
      
      // smogon/calc returns damage as an array of possible rolls or a single number (0) for immunity
      // We need to handle multi-hit moves which return an array of arrays
      const flattenDamage = (arr: any[]): number[] => {
        if (arr.length === 0) return [0];
        if (Array.isArray(arr[0])) {
          // For multi-hit, sum up the first and last elements of each sub-array
          // Actually, smogon provides a way to get the total range, but we'll do it manually for simplicity
          const min = arr.reduce((acc, sub) => acc + (typeof sub[0] === 'number' ? sub[0] : 0), 0);
          const max = arr.reduce((acc, sub) => acc + (typeof sub[sub.length - 1] === 'number' ? sub[sub.length - 1] : 0), 0);
          return [min, max];
        }
        return arr.filter(d => typeof d === 'number');
      };

      const cleanDamage = flattenDamage(damageArr);
      const minDamage = cleanDamage.length > 0 ? cleanDamage[0] : 0;
      const maxDamage = cleanDamage.length > 0 ? cleanDamage[cleanDamage.length - 1] : 0;

      // Extract effectiveness dynamically
      let effectiveness = 1;
      const activeDefType1 = defender.isTypeOverridden ? defender.type1 : defBase.type1;
      const activeDefType2 = defender.isTypeOverridden ? defender.type2 : defBase.type2;
      const defType1Id = activeDefType1 ? TYPE_IDS[activeDefType1.toLowerCase()] : null;
      const defType2Id = activeDefType2 ? TYPE_IDS[activeDefType2.toLowerCase()] : null;
      
      const calcMoveTypeId = TYPE_IDS[result.move.type.toLowerCase()] || moveData.typeId;
      effectiveness = calculateEffectiveness(efficacyMap, calcMoveTypeId, defType1Id, defType2Id);

      const activeAtkType1 = attacker.isTypeOverridden ? attacker.type1 : atkBase.type1;
      const activeAtkType2 = attacker.isTypeOverridden ? attacker.type2 : atkBase.type2;
      const attackerType1Id = activeAtkType1 ? TYPE_IDS[activeAtkType1.toLowerCase()] : null;
      const attackerType2Id = activeAtkType2 ? TYPE_IDS[activeAtkType2.toLowerCase()] : null;
      const isStab = calcMoveTypeId === attackerType1Id || calcMoveTypeId === attackerType2Id;

      const isImmune = result.damage === 0 || maxDamage === 0;

      const triggeredAbilities: string[] = [];
      let koChanceText = 'Survival';

      if (!isImmune) {
        try {
          const descStr = result.desc();
          if (result.attacker.ability && descStr.includes(result.attacker.ability)) {
            triggeredAbilities.push(result.attacker.ability);
          }
          if (result.defender.ability && descStr.includes(result.defender.ability)) {
            triggeredAbilities.push(result.defender.ability);
          }
          
          // Use kochance() to get the precise string if available
          const koObj = result.kochance();
          if (koObj && koObj.text) {
            koChanceText = koObj.text;
          } else {
             // Fallback to substring from desc if kochance() is empty
             const parts = descStr.split(' -- ');
             if (parts.length > 1) {
               koChanceText = parts[parts.length - 1];
             }
          }
        } catch (e) {
          // Ignore desc() errors
        }
      }

      const minDamageNum = isNaN(minDamage) ? 0 : Number(minDamage);
      const maxDamageNum = isNaN(maxDamage) ? 0 : Number(maxDamage);
      const smogonDefMaxHp = defenderPokemon.maxHP();

      return {
        minDamage: minDamageNum,
        maxDamage: maxDamageNum,
        minPercent: Math.floor((minDamageNum * 1000) / smogonDefMaxHp) / 10 || 0,
        maxPercent: Math.floor((maxDamageNum * 1000) / smogonDefMaxHp) / 10 || 0,
        moveName: moveData.nameEn,
        moveNameZh: moveData.nameZh,
        moveType: calcMoveTypeId,
        originalType: moveData.typeId,
        isStab,
        effectiveness,
        triggeredAbilities,
        koChanceText
      } as DamageResult;
    });
  };

  const p1Results = useMemo(() => computeResults(state.p1, state.p2, p2MaxHp), [state.p1, state.p2, p2MaxHp, efficacyMap, state.weather, state.terrain, state.isGravity, state.isSpreadTarget, state.isFairyAura, state.isDarkAura, state.isAuraBreak]);
  const p2Results = useMemo(() => computeResults(state.p2, state.p1, p1MaxHp), [state.p2, state.p1, p1MaxHp, efficacyMap, state.weather, state.terrain, state.isGravity, state.isSpreadTarget, state.isFairyAura, state.isDarkAura, state.isAuraBreak]);

  return (
    <DamageCalculatorTemplate
      activeWeather={state.weather}
      onWeatherChange={(w) => dispatch({ type: 'SET_WEATHER', payload: w })}
      activeTerrain={state.terrain}
      onTerrainChange={(t) => dispatch({ type: 'SET_TERRAIN', payload: t })}
      isGravity={state.isGravity}
      onToggleGravity={() => dispatch({ type: 'TOGGLE_GRAVITY' })}
      isSpreadTarget={state.isSpreadTarget}
      onSpreadTargetChange={(isSpread) => dispatch({ type: 'SET_SPREAD_TARGET', payload: isSpread })}
      isFairyAura={state.isFairyAura}
      isDarkAura={state.isDarkAura}
      isAuraBreak={state.isAuraBreak}
      onToggleFieldAura={(aura) => dispatch({ type: 'TOGGLE_FIELD_AURA', payload: aura })}
      resultsPanel={
        <ResultsPanel 
          p1Results={p1Results}
          p1ActiveIndex={state.p1.activeMoveIndex}
          onSelectP1Active={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p1', index } })}
          p2MaxHp={p2MaxHp}
          p2Results={p2Results}
          p2ActiveIndex={state.p2.activeMoveIndex}
          onSelectP2Active={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p2', index } })}
          p1MaxHp={p1MaxHp}
          p1HpPercent={state.p1.hpPercent}
          p2HpPercent={state.p2.hpPercent}
        />
      }
      attackerPanel={
        <PokemonPanel 
          title="Pokémon 1"
          sideColor="bg-blue-600"
          side="p1"
          pokemonList={pokemonList}
          selectedId={state.p1.selectedId}
          onSelectPokemon={(p) => handleSelectPokemon('p1', p)}
          onSelectPreset={(preset) => handleSelectPreset('p1', preset)}
          stats={state.p1}
          onSpChange={(key, val) => dispatch({ type: 'SET_SP', payload: { side: 'p1', key, val } })}
          boostedStat={state.p1.boostedStat}
          hinderedStat={state.p1.hinderedStat}
          onToggleNature={(stat, mod) => dispatch({ type: 'TOGGLE_NATURE', payload: { side: 'p1', stat, mod } })}
          stages={state.p1.stages}
          onStageChange={(stat, val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: 'p1', stat, val } })}
          moveList={moveList}
          moves={state.p1.moves}
          onSelectMove={(index, m) => dispatch({ type: 'SELECT_MOVE_FOR_SLOT', payload: { side: 'p1', index, move: m } })}
          onClearMove={(index) => dispatch({ type: 'CLEAR_MOVE_SLOT', payload: { side: 'p1', index } })}
          abilities={state.p1.abilities}
          activeAbility={state.p1.activeAbility}
          onAbilityChange={(ability) => dispatch({ type: 'SET_ACTIVE_ABILITY', payload: { side: 'p1', ability } })}
          item={state.p1.item}
          onItemChange={(item) => dispatch({ type: 'SET_ITEM', payload: { side: 'p1', item } })}
          activeWeather={state.weather}
          hpPercent={state.p1.hpPercent}
          onHpPercentChange={(val) => dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p1', val } })}
          type1={state.p1.type1}
          type2={state.p1.type2}
          onTypeChange={(slot, type) => dispatch({ type: 'SET_TYPE', payload: { side: 'p1', slot, type } })}
          isTypeOverridden={state.p1.isTypeOverridden}
          onToggleTypeOverride={() => dispatch({ type: 'TOGGLE_TYPE_OVERRIDE', payload: { side: 'p1' } })}
          isReflect={state.p1.isReflect}
          isLightScreen={state.p1.isLightScreen}
          isHelpingHand={state.p1.isHelpingHand}
          isFriendGuard={state.p1.isFriendGuard}
          isTailwind={state.p1.isTailwind}
          onToggleSideEffect={(effect) => dispatch({ type: 'TOGGLE_SIDE_EFFECT', payload: { side: 'p1', effect } })}
          movesForceCrit={state.p1.movesForceCrit}
          onToggleMoveCrit={(index) => dispatch({ type: 'TOGGLE_MOVE_CRIT', payload: { side: 'p1', index } })}
          movesHits={state.p1.movesHits}
          onUpdateMoveHits={(index, val) => dispatch({ type: 'SET_MOVE_HITS', payload: { side: 'p1', index, val } })}
        />
      }
      defenderPanel={
        <PokemonPanel 
          title="Pokémon 2"
          sideColor="bg-red-600"
          side="p2"
          pokemonList={pokemonList}
          selectedId={state.p2.selectedId}
          onSelectPokemon={(p) => handleSelectPokemon('p2', p)}
          onSelectPreset={(preset) => handleSelectPreset('p2', preset)}
          stats={state.p2}
          onSpChange={(key, val) => dispatch({ type: 'SET_SP', payload: { side: 'p2', key, val } })}
          boostedStat={state.p2.boostedStat}
          hinderedStat={state.p2.hinderedStat}
          onToggleNature={(stat, mod) => dispatch({ type: 'TOGGLE_NATURE', payload: { side: 'p2', stat, mod } })}
          stages={state.p2.stages}
          onStageChange={(stat, val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: 'p2', stat, val } })}
          moveList={moveList}
          moves={state.p2.moves}
          onSelectMove={(index, m) => dispatch({ type: 'SELECT_MOVE_FOR_SLOT', payload: { side: 'p2', index, move: m } })}
          onClearMove={(index) => dispatch({ type: 'CLEAR_MOVE_SLOT', payload: { side: 'p2', index } })}
          abilities={state.p2.abilities}
          activeAbility={state.p2.activeAbility}
          onAbilityChange={(ability) => dispatch({ type: 'SET_ACTIVE_ABILITY', payload: { side: 'p2', ability } })}
          item={state.p2.item}
          onItemChange={(item) => dispatch({ type: 'SET_ITEM', payload: { side: 'p2', item } })}
          activeWeather={state.weather}
          hpPercent={state.p2.hpPercent}
          onHpPercentChange={(val) => dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val } })}
          type1={state.p2.type1}
          type2={state.p2.type2}
          onTypeChange={(slot, type) => dispatch({ type: 'SET_TYPE', payload: { side: 'p2', slot, type } })}
          isTypeOverridden={state.p2.isTypeOverridden}
          onToggleTypeOverride={() => dispatch({ type: 'TOGGLE_TYPE_OVERRIDE', payload: { side: 'p2' } })}
          isReflect={state.p2.isReflect}
          isLightScreen={state.p2.isLightScreen}
          isHelpingHand={state.p2.isHelpingHand}
          isFriendGuard={state.p2.isFriendGuard}
          isTailwind={state.p2.isTailwind}
          onToggleSideEffect={(effect) => dispatch({ type: 'TOGGLE_SIDE_EFFECT', payload: { side: 'p2', effect } })}
          movesForceCrit={state.p2.movesForceCrit}
          onToggleMoveCrit={(index) => dispatch({ type: 'TOGGLE_MOVE_CRIT', payload: { side: 'p2', index } })}
          movesHits={state.p2.movesHits}
          onUpdateMoveHits={(index, val) => dispatch({ type: 'SET_MOVE_HITS', payload: { side: 'p2', index, val } })}
        />
      }
    />
  );
};

export default DamageCalculatorPage;
