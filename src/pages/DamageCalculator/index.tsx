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

interface SideState {
  selectedId: number | null;
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
  move: {
    power: number;
    category: 'physical' | 'special';
    isStab: boolean;
    effectiveness: number;
  };
}

type CalcAction = 
  | { type: 'SET_SP', payload: { side: 'attacker' | 'defender', key: string, val: number } }
  | { type: 'SET_NATURE', payload: { side: 'attacker' | 'defender', val: number } }
  | { type: 'SET_MOVE', payload: Partial<CalcState['move']> }
  | { type: 'SELECT_POKEMON', payload: { side: 'attacker' | 'defender', pokemon: PokemonBaseStats } };

const initialSide: SideState = {
  selectedId: null,
  baseHp: 100, baseAtk: 100, baseDef: 100, baseSpa: 100, baseSpd: 100, baseSpe: 100,
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
  nature: 1.0
};

const initialState: CalcState = {
  attacker: { ...initialSide, spAtk: 32, spSpa: 32 },
  defender: initialSide,
  move: { power: 80, category: 'physical', isStab: true, effectiveness: 1.0 },
};

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'SET_SP': {
      const { side, key, val } = action.payload;
      return { ...state, [side]: { ...state[side], [key]: val } };
    }
    case 'SET_NATURE':
      return { ...state, [action.payload.side]: { ...state[action.payload.side], nature: action.payload.val } };
    case 'SET_MOVE': 
      return { ...state, move: { ...state.move, ...action.payload } };
    case 'SELECT_POKEMON': {
      const { side, pokemon: p } = action.payload;
      return {
        ...state,
        [side]: {
          ...state[side],
          selectedId: p.id,
          baseHp: p.baseHp,
          baseAtk: p.baseAttack,
          baseDef: p.baseDefense,
          baseSpa: p.baseSpAtk,
          baseSpd: p.baseSpDef,
          baseSpe: p.baseSpeed,
        }
      };
    }
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
    const isPhys = state.move.category === 'physical';
    
    const atkStatValue = isPhys ? state.attacker.baseAtk : state.attacker.baseSpa;
    const atkSpValue = isPhys ? state.attacker.spAtk : state.attacker.spSpa;
    
    const defStatValue = isPhys ? state.defender.baseDef : state.defender.baseSpd;
    const defSpValue = isPhys ? state.defender.spDef : state.defender.spSpd;

    const attackerStat = calculateStat(atkStatValue, atkSpValue, state.attacker.nature);
    const defenderStat = calculateStat(defStatValue, defSpValue, state.defender.nature);
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
          onSelectPokemon={(p) => dispatch({ type: 'SELECT_POKEMON', payload: { side: 'attacker', pokemon: p } })}
          stats={state.attacker}
          onSpChange={(key, val) => dispatch({ type: 'SET_SP', payload: { side: 'attacker', key, val } })}
          nature={state.attacker.nature}
          onNatureChange={(val) => dispatch({ type: 'SET_NATURE', payload: { side: 'attacker', val } })}
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
          onSelectPokemon={(p) => dispatch({ type: 'SELECT_POKEMON', payload: { side: 'defender', pokemon: p } })}
          stats={state.defender}
          onSpChange={(key, val) => dispatch({ type: 'SET_SP', payload: { side: 'defender', key, val } })}
          nature={state.defender.nature}
          onNatureChange={(val) => dispatch({ type: 'SET_NATURE', payload: { side: 'defender', val } })}
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
