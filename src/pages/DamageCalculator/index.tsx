import React, { useReducer, useMemo, useEffect, useState } from 'react';
import DamageCalculatorTemplate from '@/components/templates/DamageCalculatorTemplate';
import AttackerPanel from '@/components/organisms/AttackerPanel';
import DefenderPanel from '@/components/organisms/DefenderPanel';
import ResultsPanel from '@/components/organisms/ResultsPanel';
import { calculateHP, calculateStat, calculateDamage } from '@/utils/damage';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface CalcState {
  attacker: {
    selectedId: number | null;
    baseAtk: number;
    spAtk: number;
    nature: number;
  };
  defender: {
    selectedId: number | null;
    baseHp: number;
    spHp: number;
    baseDef: number;
    spDef: number;
    nature: number;
  };
  move: {
    power: number;
    category: 'physical' | 'special';
    isStab: boolean;
    effectiveness: number;
  };
}

type CalcAction = 
  | { type: 'SET_ATTACKER', payload: Partial<CalcState['attacker']> }
  | { type: 'SET_DEFENDER', payload: Partial<CalcState['defender']> }
  | { type: 'SET_MOVE', payload: Partial<CalcState['move']> }
  | { type: 'SELECT_ATTACKER', payload: PokemonBaseStats }
  | { type: 'SELECT_DEFENDER', payload: PokemonBaseStats };

const initialState: CalcState = {
  attacker: { selectedId: null, baseAtk: 100, spAtk: 32, nature: 1.0 },
  defender: { selectedId: null, baseHp: 100, spHp: 0, baseDef: 100, spDef: 0, nature: 1.0 },
  move: { power: 80, category: 'physical', isStab: true, effectiveness: 1.0 },
};

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'SET_ATTACKER': return { ...state, attacker: { ...state.attacker, ...action.payload } };
    case 'SET_DEFENDER': return { ...state, defender: { ...state.defender, ...action.payload } };
    case 'SET_MOVE': return { ...state, move: { ...state.move, ...action.payload } };
    case 'SELECT_ATTACKER': 
      return { 
        ...state, 
        attacker: { 
          ...state.attacker, 
          selectedId: action.payload.id,
          baseAtk: state.move.category === 'physical' ? action.payload.baseAttack : action.payload.baseSpAtk 
        } 
      };
    case 'SELECT_DEFENDER':
      return {
        ...state,
        defender: {
          ...state.defender,
          selectedId: action.payload.id,
          baseHp: action.payload.baseHp,
          baseDef: state.move.category === 'physical' ? action.payload.baseDefense : action.payload.baseSpDef
        }
      };
    default: return state;
  }
}

const DamageCalculatorPage: React.FC = () => {
  const [state, dispatch] = useReducer(calcReducer, initialState);
  const [pokemonList, setPokemonList] = useState<PokemonBaseStats[]>([]);

  useEffect(() => {
    const fetchPokemon = async () => {
      try {
        const db = await getDb();
        const result = await db
          .select({
            id: pokemon.id,
            nameEn: pokemon.nameEn,
            nameZh: pokemon.nameZh,
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
          .where(eq(formats.name, 'Regulation M-A'));
        
        setPokemonList(result as PokemonBaseStats[]);
      } catch (error) {
        console.error('Failed to fetch pokemon list:', error);
      }
    };
    fetchPokemon();
  }, []);

  const results = useMemo(() => {
    const attackerStat = calculateStat(state.attacker.baseAtk, state.attacker.spAtk, state.attacker.nature);
    const defenderStat = calculateStat(state.defender.baseDef, state.defender.spDef, state.defender.nature);
    const maxHP = calculateHP(state.defender.baseHp, state.defender.spHp);
    
    const stabMod = state.move.isStab ? 1.5 : 1;
    const totalMod = stabMod * state.move.effectiveness;

    return {
      ...calculateDamage(attackerStat, defenderStat, state.move.power, totalMod, maxHP),
      defenderMaxHp: maxHP
    };
  }, [state]);

  return (
    <DamageCalculatorTemplate
      attackerPanel={
        <AttackerPanel 
          pokemonList={pokemonList}
          selectedId={state.attacker.selectedId}
          onSelectPokemon={(p) => dispatch({ type: 'SELECT_ATTACKER', payload: p })}
          baseAtk={state.attacker.baseAtk}
          onBaseAtkChange={(val) => dispatch({ type: 'SET_ATTACKER', payload: { baseAtk: val } })}
          spAtk={state.attacker.spAtk}
          onSpAtkChange={(val) => dispatch({ type: 'SET_ATTACKER', payload: { spAtk: val } })}
          natureAtk={state.attacker.nature}
          onNatureAtkChange={(val) => dispatch({ type: 'SET_ATTACKER', payload: { nature: val } })}
          movePower={state.move.power}
          onMovePowerChange={(val) => dispatch({ type: 'SET_MOVE', payload: { power: val } })}
          moveCategory={state.move.category}
          onMoveCategoryChange={(val) => dispatch({ type: 'SET_MOVE', payload: { category: val } })}
          isStab={state.move.isStab}
          onStabChange={(val) => dispatch({ type: 'SET_MOVE', payload: { isStab: val } })}
        />
      }
      defenderPanel={
        <DefenderPanel 
          pokemonList={pokemonList}
          selectedId={state.defender.selectedId}
          onSelectPokemon={(p) => dispatch({ type: 'SELECT_DEFENDER', payload: p })}
          baseHp={state.defender.baseHp}
          onBaseHpChange={(val) => dispatch({ type: 'SET_DEFENDER', payload: { baseHp: val } })}
          spHp={state.defender.spHp}
          onSpHpChange={(val) => dispatch({ type: 'SET_DEFENDER', payload: { spHp: val } })}
          baseDef={state.defender.baseDef}
          onBaseDefChange={(val) => dispatch({ type: 'SET_DEFENDER', payload: { baseDef: val } })}
          spDef={state.defender.spDef}
          onSpDefChange={(val) => dispatch({ type: 'SET_DEFENDER', payload: { spDef: val } })}
          natureDef={state.defender.nature}
          onNatureDefChange={(val) => dispatch({ type: 'SET_DEFENDER', payload: { nature: val } })}
          effectiveness={state.move.effectiveness}
          onEffectivenessChange={(val) => dispatch({ type: 'SET_MOVE', payload: { effectiveness: val } })}
          moveCategory={state.move.category}
        />
      }
      resultsPanel={
        <ResultsPanel 
          minDamage={results.minDamage}
          maxDamage={results.maxDamage}
          minPercent={results.minPercent}
          maxPercent={results.maxPercent}
          defenderMaxHp={results.defenderMaxHp}
        />
      }
    />
  );
};

export default DamageCalculatorPage;
