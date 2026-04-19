import React, { useReducer, useMemo, useEffect, useState } from 'react';
import DamageCalculatorTemplate from '@/components/templates/DamageCalculatorTemplate';
import AttackerPanel from '@/components/organisms/AttackerPanel';
import DefenderPanel from '@/components/organisms/DefenderPanel';
import ResultsPanel from '@/components/organisms/ResultsPanel';
import { calculateHP, calculateStat, calculateDamage } from '@/utils/damage';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, moves } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { fetchTypeEfficacy, calculateEffectiveness, TypeEfficacyMap } from '@/utils/type-effectiveness';
import { TYPE_IDS } from '@/utils/pokemon-types';
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
  nature: number;
}

interface CalcState {
  attacker: SideState;
  defender: SideState;
  moves: (MoveData | null)[];
  activeMoveIndex: number;
}

type CalcAction = 
  | { type: 'SET_SP', payload: { side: 'attacker' | 'defender', key: string, val: number } }
  | { type: 'SET_NATURE', payload: { side: 'attacker' | 'defender', val: number } }
  | { type: 'SET_MOVE_POWER', payload: number }
  | { type: 'SET_MOVE_CATEGORY', payload: 'physical' | 'special' }
  | { type: 'SELECT_POKEMON', payload: { side: 'attacker' | 'defender', pokemon: PokemonBaseStats } }
  | { type: 'SELECT_MOVE_FOR_SLOT', payload: { index: number, move: MoveData } }
  | { type: 'SET_ACTIVE_MOVE_SLOT', payload: number };

const initialSide: SideState = {
  selectedId: null,
  type1: null,
  type2: null,
  baseHp: 100, baseAtk: 100, baseDef: 100, baseSpa: 100, baseSpd: 100, baseSpe: 100,
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
  nature: 1.0
};

const initialState: CalcState = {
  attacker: { ...initialSide, spAtk: 32, spSpa: 32 },
  defender: initialSide,
  moves: [null, null, null, null],
  activeMoveIndex: 0,
};

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'SET_SP': {
      const { side, key, val } = action.payload;
      return { ...state, [side]: { ...state[side], [key]: val } };
    }
    case 'SET_NATURE':
      return { ...state, [action.payload.side]: { ...state[action.payload.side], nature: action.payload.val } };
    case 'SET_MOVE_POWER': {
      const newMoves = [...state.moves];
      const activeMove = newMoves[state.activeMoveIndex];
      if (activeMove) {
        newMoves[state.activeMoveIndex] = { ...activeMove, power: action.payload };
      }
      return { ...state, moves: newMoves };
    }
    case 'SET_MOVE_CATEGORY': {
      const newMoves = [...state.moves];
      const activeMove = newMoves[state.activeMoveIndex];
      if (activeMove) {
        newMoves[state.activeMoveIndex] = { ...activeMove, damageClassId: action.payload === 'physical' ? 2 : 3 };
      }
      return { ...state, moves: newMoves };
    }
    case 'SELECT_POKEMON': {
      const { side, pokemon: p } = action.payload;
      const newState = {
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
        }
      };
      if (side === 'attacker') {
        newState.moves = [null, null, null, null];
      }
      return newState;
    }
    case 'SELECT_MOVE_FOR_SLOT': {
      const newMoves = [...state.moves];
      newMoves[action.payload.index] = action.payload.move;
      return { ...state, moves: newMoves, activeMoveIndex: action.payload.index };
    }
    case 'SET_ACTIVE_MOVE_SLOT':
      return { ...state, activeMoveIndex: action.payload };
    default: return state;
  }
}

const DamageCalculatorPage: React.FC = () => {
  const [state, dispatch] = useReducer(calcReducer, initialState);
  const [pokemonList, setPokemonList] = useState<PokemonBaseStats[]>([]);
  const [moveList, setMoveList] = useState<MoveData[]>([]);
  const [efficacyMap, setEfficacyMap] = useState<TypeEfficacyMap>({});

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
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const results = useMemo(() => {
    const activeMove = state.moves[state.activeMoveIndex];
    const movePower = activeMove?.power || 0;
    const moveCategory = activeMove?.damageClassId === 2 ? 'physical' : 'special';
    const moveTypeId = activeMove?.typeId || 1;

    const isPhys = moveCategory === 'physical';
    
    const atkStatValue = isPhys ? state.attacker.baseAtk : state.attacker.baseSpa;
    const atkSpValue = isPhys ? state.attacker.spAtk : state.attacker.spSpa;
    
    const defStatValue = isPhys ? state.defender.baseDef : state.defender.baseSpd;
    const defSpValue = isPhys ? state.defender.spDef : state.defender.spSpd;

    const attackerStat = calculateStat(atkStatValue, atkSpValue, state.attacker.nature);
    const defenderStat = calculateStat(defStatValue, defSpValue, state.defender.nature);
    const maxHP = calculateHP(state.defender.baseHp, state.defender.spHp);
    
    // Automated STAB
    const attackerType1Id = state.attacker.type1 ? TYPE_IDS[state.attacker.type1.toLowerCase()] : null;
    const attackerType2Id = state.attacker.type2 ? TYPE_IDS[state.attacker.type2.toLowerCase()] : null;
    const isStab = activeMove !== null && (moveTypeId === attackerType1Id || moveTypeId === attackerType2Id);
    const stabMod = isStab ? 1.5 : 1;

    // Automated Effectiveness
    const defType1Id = state.defender.type1 ? TYPE_IDS[state.defender.type1.toLowerCase()] : null;
    const defType2Id = state.defender.type2 ? TYPE_IDS[state.defender.type2.toLowerCase()] : null;
    
    const effectiveness = calculateEffectiveness(efficacyMap, moveTypeId, defType1Id, defType2Id);
    
    const totalMod = stabMod * effectiveness;

    return {
      ...calculateDamage(attackerStat, defenderStat, movePower, totalMod, maxHP),
      defenderMaxHp: maxHP,
      isStab,
      effectiveness,
      moveCategory: moveCategory as 'physical' | 'special'
    };
  }, [state, efficacyMap]);

  return (
    <DamageCalculatorTemplate
      attackerPanel={
        <AttackerPanel 
          pokemonList={pokemonList}
          selectedId={state.attacker.selectedId}
          onSelectPokemon={(p) => dispatch({ type: 'SELECT_POKEMON', payload: { side: 'attacker', pokemon: p } })}
          stats={state.attacker}
          onSpChange={(key, val) => dispatch({ type: 'SET_SP', payload: { side: 'attacker', key, val } })}
          nature={state.attacker.nature}
          onNatureChange={(val) => dispatch({ type: 'SET_NATURE', payload: { side: 'attacker', val } })}
          moveList={moveList}
          moves={state.moves}
          activeMoveIndex={state.activeMoveIndex}
          onSelectMove={(index, m) => dispatch({ type: 'SELECT_MOVE_FOR_SLOT', payload: { index, move: m } })}
          onSetActiveMove={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: index })}
          onMovePowerChange={(val) => dispatch({ type: 'SET_MOVE_POWER', payload: val })}
          onMoveCategoryChange={(val) => dispatch({ type: 'SET_MOVE_CATEGORY', payload: val })}
        />
      }
      defenderPanel={
        <DefenderPanel 
          pokemonList={pokemonList}
          selectedId={state.defender.selectedId}
          onSelectPokemon={(p) => dispatch({ type: 'SELECT_POKEMON', payload: { side: 'defender', pokemon: p } })}
          stats={state.defender}
          onSpChange={(key, val) => dispatch({ type: 'SET_SP', payload: { side: 'defender', key, val } })}
          nature={state.defender.nature}
          onNatureChange={(val) => dispatch({ type: 'SET_NATURE', payload: { side: 'defender', val } })}
          effectiveness={results.effectiveness}
          moveCategory={results.moveCategory}
        />
      }
      resultsPanel={
        <ResultsPanel 
          minDamage={results.minDamage}
          maxDamage={results.maxDamage}
          minPercent={results.minPercent}
          maxPercent={results.maxPercent}
          defenderMaxHp={results.defenderMaxHp}
          isStab={results.isStab}
        />
      }
    />
  );
};

export default DamageCalculatorPage;
