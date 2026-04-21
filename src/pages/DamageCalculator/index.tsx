import React, { useReducer, useMemo, useEffect, useState } from 'react';
import DamageCalculatorTemplate from '@/components/templates/DamageCalculatorTemplate';
import PokemonPanel from '@/components/organisms/PokemonPanel';
import ResultsPanel, { DamageResult } from '@/components/organisms/ResultsPanel';
import { calculateHP, calculateStat, calculateDamage, getBasePowerModifier, getStatModifier, getFinalDamageModifier, getModifiedMoveType, getWeatherDamageModifier, getSpreadModifier } from '@/utils/damage';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, moves, pokemonAbilities, abilities } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { fetchTypeEfficacy, calculateEffectiveness, TypeEfficacyMap } from '@/utils/type-effectiveness';
import { TYPE_IDS, REVERSE_TYPE_IDS } from '@/utils/pokemon-types';
import { MoveData } from '@/components/molecules/MoveSearchSelect';

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
}

interface CalcState {
  p1: SideState;
  p2: SideState;
  weather: 'None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow';
  isSpreadTarget: boolean;
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
  | { type: 'SET_WEATHER', payload: 'None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow' }
  | { type: 'SET_SPREAD_TARGET', payload: boolean }
  | { type: 'SET_HP_PERCENT', payload: { side: 'p1' | 'p2', val: number } };

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
};

const initialState: CalcState = {
  p1: { ...initialSide, spAtk: 32, spSpa: 32 },
  p2: initialSide,
  weather: 'None',
  isSpreadTarget: false,
};

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'SET_WEATHER':
      return { ...state, weather: action.payload };
    case 'SET_SPREAD_TARGET':
      return { ...state, isSpreadTarget: action.payload };
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
          hpPercent: 100
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
    } catch (error) {
      console.error('Failed to fetch abilities:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = await getDb();
        const [pokeResult, efficacyResult, moveResult] = await Promise.all([
          db.select({
            id: pokemon.id,
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
    return attacker.moves.map((move) => {
      if (!move) return null;

      const movePower = move.power || 0;
      const moveCategory = move.damageClassId === 2 ? 'physical' : move.damageClassId === 3 ? 'special' : 'status';
      const moveTypeId = move.typeId || 1;
      const originalTypeName = REVERSE_TYPE_IDS[moveTypeId] || 'normal';

      // Pipeline Step 0: Modified Move Type (including Weather Ball)
      const modifiedTypeName = getModifiedMoveType(originalTypeName, move.nameEn, attacker.activeAbility, state.weather);
      const modifiedTypeId = TYPE_IDS[modifiedTypeName.toLowerCase()] || moveTypeId;

      const isPhys = moveCategory === 'physical';
      
      const atkStatValue = isPhys ? attacker.baseAtk : attacker.baseSpa;
      const atkSpValue = isPhys ? attacker.spAtk : attacker.spSpa;
      const atkStatKey = (isPhys ? 'atk' : 'spa') as 'atk' | 'spa';

      const defStatValue = isPhys ? defender.baseDef : defender.baseSpd;
      const defSpValue = isPhys ? defender.spDef : defender.spSpd;
      const defStatKey = (isPhys ? 'def' : 'spd') as 'def' | 'spd';

      const attackerMultiplier = (atkStatKey === attacker.boostedStat) ? 1.1 : (atkStatKey === attacker.hinderedStat) ? 0.9 : 1.0;
      const defenderMultiplier = (defStatKey === defender.boostedStat) ? 1.1 : (defStatKey === defender.hinderedStat) ? 0.9 : 1.0;

      // Pipeline Step 1: Modified Base Power (including Weather Ball)
      const bpMod = getBasePowerModifier(attacker.activeAbility, modifiedTypeName, movePower, moveCategory, move.nameEn, originalTypeName, state.weather, attacker.hpPercent);
      const modifiedPower = Math.floor(movePower * bpMod);

      // Pipeline Step 2: Stats with Ability & Weather Modifiers
      const attackerTypes = [attacker.type1, attacker.type2].filter((t): t is string => !!t).map(t => t.toLowerCase());
      const defenderTypes = [defender.type1, defender.type2].filter((t): t is string => !!t).map(t => t.toLowerCase());
      
      const attackerAbilityMod = getStatModifier(attacker.activeAbility, atkStatKey, 'attacker', attackerTypes, state.weather);
      const defenderAbilityMod = getStatModifier(defender.activeAbility, defStatKey, 'defender', defenderTypes, state.weather);

      const attackerStat = calculateStat(atkStatValue, atkSpValue, attackerMultiplier, attacker.stages[atkStatKey], attackerAbilityMod);
      const defenderStat = calculateStat(defStatValue, defSpValue, defenderMultiplier, defender.stages[defStatKey], defenderAbilityMod);
      
      const attackerType1Id = attacker.type1 ? TYPE_IDS[attacker.type1.toLowerCase()] : null;
      const attackerType2Id = attacker.type2 ? TYPE_IDS[attacker.type2.toLowerCase()] : null;
      const isStab = modifiedTypeId === attackerType1Id || modifiedTypeId === attackerType2Id;
      
      const isAdaptability = attacker.activeAbility?.toLowerCase() === 'adaptability';
      const stabMultiplier = isStab ? (isAdaptability ? 2.0 : 1.5) : 1;

      const defType1Id = defender.type1 ? TYPE_IDS[defender.type1.toLowerCase()] : null;
      const defType2Id = defender.type2 ? TYPE_IDS[defender.type2.toLowerCase()] : null;
      const effectiveness = calculateEffectiveness(efficacyMap, modifiedTypeId, defType1Id, defType2Id);
      
      // Pipeline Step 3: Weather Damage Modifiers
      const weatherMod = getWeatherDamageModifier(state.weather, modifiedTypeName);

      // Pipeline Step 4: Final Damage Modifier
      const spreadMod = getSpreadModifier(state.isSpreadTarget);
      const finalModifier = getFinalDamageModifier(defender.activeAbility, attacker.activeAbility, modifiedTypeName, effectiveness) * weatherMod;
      
      const damage = calculateDamage(attackerStat, defenderStat, modifiedPower, stabMultiplier, effectiveness, finalModifier, spreadMod, defMaxHp);

      return {
        ...damage,
        moveName: move.nameEn,
        moveType: modifiedTypeId,
        originalType: moveTypeId,
        isStab,
        effectiveness
      } as DamageResult;
    });
  };

  const p1Results = useMemo(() => computeResults(state.p1, state.p2, p2MaxHp), [state.p1, state.p2, p2MaxHp, efficacyMap, state.weather, state.isSpreadTarget]);
  const p2Results = useMemo(() => computeResults(state.p2, state.p1, p1MaxHp), [state.p2, state.p1, p1MaxHp, efficacyMap, state.weather, state.isSpreadTarget]);

  return (
    <DamageCalculatorTemplate
      activeWeather={state.weather}
      onWeatherChange={(w) => dispatch({ type: 'SET_WEATHER', payload: w })}
      isSpreadTarget={state.isSpreadTarget}
      onSpreadTargetChange={(isSpread) => dispatch({ type: 'SET_SPREAD_TARGET', payload: isSpread })}
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
          activeWeather={state.weather}
          hpPercent={state.p1.hpPercent}
          onHpPercentChange={(val) => dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p1', val } })}
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
          activeWeather={state.weather}
          hpPercent={state.p2.hpPercent}
          onHpPercentChange={(val) => dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val } })}
        />
      }
    />
  );
};

export default DamageCalculatorPage;
