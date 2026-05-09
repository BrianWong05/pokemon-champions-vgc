import React, { useReducer, useMemo, useEffect, useState } from 'react';
import DamageCalculatorTemplate from '@/components/templates/DamageCalculatorTemplate';
import PokemonPanel from '@/components/organisms/PokemonPanel';
import ResultsPanel, { DamageResult } from '@/components/organisms/ResultsPanel';
import { calculateHP, calculateStat, calculateSmogonDamage, mapToSmogonPokemon, mapToSmogonField, mapToSmogonMove, getMovePowerModifier } from '@/features/damage-calculator/utils/damage-calc';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, moves, pokemonAbilities, abilities } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { fetchTypeEfficacy, calculateEffectiveness, TypeEfficacyMap } from '@/features/pokemon/utils/type-effectiveness';
import { TYPE_IDS, REVERSE_TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { POKEMON_PRESETS, PokemonPreset } from '@/features/pokemon/utils/pokemon-presets';
import { getNatureStats, getNatureFromStats, getFormattedNature } from '@/features/pokemon/utils/pokemon-natures';
import { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import { AEGISLASH_ID } from '@/features/pokemon/hooks/usePokemonEditor';

import { useCalculatorState, SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import { useDamageCalc } from '@/features/damage-calculator/hooks/useDamageCalc';
import { AttackerPanel } from '@/features/damage-calculator/components/AttackerPanel';
import { DefenderPanel } from '@/features/damage-calculator/components/DefenderPanel';
import { ResultSummary } from '@/features/damage-calculator/components/ResultSummary';

const DamageCalculatorPage: React.FC = () => {
  const { state, dispatch } = useCalculatorState();
  const [pokemonList, setPokemonList] = useState<PokemonBaseStats[]>([]);
  const [moveList, setMoveList] = useState<MoveData[]>([]);
  const [efficacyMap, setEfficacyMap] = useState<TypeEfficacyMap>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = await getDb();
        const [pokeResult, moveResult, efficacyResult] = await Promise.all([
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
          db.select().from(moves),
          fetchTypeEfficacy()
        ]);
        
        setPokemonList(pokeResult as PokemonBaseStats[]);
        setMoveList(moveResult as MoveData[]);
        setEfficacyMap(efficacyResult);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };
    fetchData();
  }, []);

  const { p1MaxHp, p2MaxHp, p1Results, p2Results } = useDamageCalc(state, pokemonList, efficacyMap);

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
        <ResultSummary 
          state={state} 
          dispatch={dispatch} 
          p1Results={p1Results} 
          p2Results={p2Results} 
          p1MaxHp={p1MaxHp} 
          p2MaxHp={p2MaxHp} 
        />
      }
      attackerPanel={
        <AttackerPanel 
          state={state} 
          dispatch={dispatch} 
          pokemonList={pokemonList} 
          moveList={moveList} 
        />
      }
      defenderPanel={
        <DefenderPanel 
          state={state} 
          dispatch={dispatch} 
          pokemonList={pokemonList} 
          moveList={moveList} 
        />
      }
    />
  );
};

export default DamageCalculatorPage;
