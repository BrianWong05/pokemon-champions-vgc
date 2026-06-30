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

import { useFormat } from '@/features/formats/FormatContext';
import { useCalculatorState, SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import { useCalculatorActions } from '@/features/damage-calculator/hooks/useCalculatorActions';
import { useDamageCalc } from '@/features/damage-calculator/hooks/useDamageCalc';
import { AttackerPanel } from '@/features/damage-calculator/components/AttackerPanel';
import { DefenderPanel } from '@/features/damage-calculator/components/DefenderPanel';
import { ResultSummary } from '@/features/damage-calculator/components/ResultSummary';
import ScanTeamModal from '@/features/scan/ScanTeamModal';
import { useTeams } from '@/features/teams/hooks/useTeams';
import { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';

const DamageCalculatorPage: React.FC = () => {
  const { state, dispatch } = useCalculatorState();
  const { format } = useFormat();
  const [pokemonList, setPokemonList] = useState<PokemonBaseStats[]>([]);
  const [moveList, setMoveList] = useState<MoveData[]>([]);
  const [efficacyMap, setEfficacyMap] = useState<TypeEfficacyMap>({});
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const { createTeam } = useTeams();
  const actions = useCalculatorActions(dispatch, pokemonList, moveList);

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
          .where(eq(formats.name, format)),
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
  }, [format]);

  const { p1MaxHp, p2MaxHp, p1Results, p2Results } = useDamageCalc(state, pokemonList, efficacyMap);

  const handleLoadDefender = (pokemonId: number) => {
    const p = pokemonList.find((p) => p.id === pokemonId);
    if (!p) return;
    actions.handleSelectPokemon('p2', p);
  };

  const handleSaveOppTeam = async (sets: ParsedShowdownSet[]) => {
    const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const newMembers: PokemonConfig[] = [];
    const db = await getDb();

    for (const set of sets.slice(0, 6)) {
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

      if (!p) continue;

      let abilityNames: string[] = [];
      try {
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

      newMembers.push({
        selectedId: p.id,
        type1: p.type1,
        type2: p.type2,
        baseHp: p.baseHp,
        baseAtk: p.baseAttack,
        baseDef: p.baseDefense,
        baseSpa: p.baseSpAtk,
        baseSpd: p.baseSpDef,
        baseSpe: p.baseSpeed,
        spHp: set.evs.hp,
        spAtk: set.evs.atk,
        spDef: set.evs.def,
        spSpa: set.evs.spa,
        spSpd: set.evs.spd,
        spSpe: set.evs.spe,
        nature: getFormattedNature(set.nature),
        boostedStat: natureStats.boostedStat,
        hinderedStat: natureStats.hinderedStat,
        moves: movesData.slice(0, 4),
        activeMoveIndex: 0,
        abilities: abilityNames,
        activeAbility: set.ability && abilityNames.includes(set.ability) ? set.ability : (abilityNames[0] || null),
        item: set.item,
        hpPercent: 100,
        isTypeOverridden: false,
      });
    }

    if (newMembers.length === 0) {
      alert('Could not find any Pokémon from the scanned team in our database.');
      return;
    }

    const teamName = sets[0].species + "'s Team";
    await createTeam(teamName, newMembers);
  };

  return (
    <>
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
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setIsScanModalOpen(true)}
              className="px-4 py-2 rounded bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
            >
              Scan opponent
            </button>
          </div>
          <DefenderPanel
            state={state}
            dispatch={dispatch}
            pokemonList={pokemonList}
            moveList={moveList}
          />
        </div>
      }
    />
    <ScanTeamModal
      isOpen={isScanModalOpen}
      onClose={() => setIsScanModalOpen(false)}
      pokemonList={pokemonList}
      onLoadPokemon={handleLoadDefender}
      onSaveTeam={handleSaveOppTeam}
    />
    </>
  );
};

export default DamageCalculatorPage;
