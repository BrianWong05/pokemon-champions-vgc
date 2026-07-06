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
import OneTapCaptureToggle from '@/features/scan/OneTapCaptureToggle';
import type { CapturedFrame } from '@/features/scan/captureSource';
import { loadSavedBuild, saveBuild, clearBuild, type SavedBuild } from '@/features/damage-calculator/utils/build-store';
import type { Spread } from '@/features/damage-calculator/utils/common-spreads';
import { useTeams } from '@/features/teams/hooks/useTeams';
import { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import { matchSpecies, matchMove, matchAbility, matchItem } from '@/features/pokemon/utils/showdown-matcher';
import { useToast } from '@/hooks/useToast';
import { ToastNotification } from '@/components/atoms/ToastNotification';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ArenaCalculator } from '@/features/damage-calculator/components/mobile/ArenaCalculator';

const speciesNameOf = (side: SideState, list: { id: number; nameEn: string }[]) =>
  list.find((p) => p.id === side.selectedId)?.nameEn ?? null;
const buildOf = (side: SideState): SavedBuild => ({
  nature: side.nature, ability: side.activeAbility, item: side.item,
  sp: { hp: side.spHp, atk: side.spAtk, def: side.spDef, spa: side.spSpa, spd: side.spSpd, spe: side.spSpe },
});
const isDefaultBuild = (side: SideState) =>
  side.spHp === 0 && side.spAtk === 0 && side.spDef === 0 && side.spSpa === 0 && side.spSpd === 0 && side.spSpe === 0
  && side.nature === 'Hardy' && side.item == null;

const DamageCalculatorPage: React.FC = () => {
  const { state, dispatch } = useCalculatorState();
  const { format } = useFormat();
  const [pokemonList, setPokemonList] = useState<PokemonBaseStats[]>([]);
  const [moveList, setMoveList] = useState<MoveData[]>([]);
  const [efficacyMap, setEfficacyMap] = useState<TypeEfficacyMap>({});
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const { createTeam } = useTeams();
  const actions = useCalculatorActions(dispatch, pokemonList, moveList);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleCaptured = React.useCallback((frame: CapturedFrame) => {
    setCapturedBlob(frame.blob);
    setIsScanModalOpen(true);
  }, []);

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

  const handleLoadDefender = async (pokemonId: number, opts?: { hpPercent?: number | null }) => {
    const p = pokemonList.find((p) => p.id === pokemonId);
    if (!p) return;
    await actions.handleSelectPokemon('p2', p);
    if (opts?.hpPercent != null) dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: opts.hpPercent } });
    const build = loadSavedBuild(p.nameEn);
    if (build) dispatch({ type: 'APPLY_SAVED_BUILD', payload: { side: 'p2', build } });
    dispatch({ type: 'SET_SCAN_LOADED', payload: { side: 'p2', val: true } });
  };

  const handleLoadAttacker = async (pokemonId: number, opts?: { hpPercent?: number | null }) => {
    const p = pokemonList.find((p) => p.id === pokemonId);
    if (!p) return;
    await actions.handleSelectPokemon('p1', p);
    if (opts?.hpPercent != null) dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p1', val: opts.hpPercent } });
    const build = loadSavedBuild(p.nameEn);
    if (build) dispatch({ type: 'APPLY_SAVED_BUILD', payload: { side: 'p1', build } });
    dispatch({ type: 'SET_SCAN_LOADED', payload: { side: 'p1', val: true } });
  };

  const persistIfScanLoaded = (side: SideState) => {
    if (!side.loadedFromScan || isDefaultBuild(side)) return;
    const species = speciesNameOf(side, pokemonList);
    if (species) saveBuild(species, buildOf(side));
  };
  useEffect(() => { persistIfScanLoaded(state.p1); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.p1.loadedFromScan, state.p1.nature, state.p1.item, state.p1.activeAbility,
     state.p1.spHp, state.p1.spAtk, state.p1.spDef, state.p1.spSpa, state.p1.spSpd, state.p1.spSpe]);
  useEffect(() => { persistIfScanLoaded(state.p2); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.p2.loadedFromScan, state.p2.nature, state.p2.item, state.p2.activeAbility,
     state.p2.spHp, state.p2.spAtk, state.p2.spDef, state.p2.spSpa, state.p2.spSpd, state.p2.spSpe]);

  const handleApplySpread = (side: 'p1' | 'p2', spread: Spread) =>
    dispatch({ type: 'APPLY_SPREAD', payload: { side, sp: spread.sp, nature: spread.nature } });
  const handleResetBuild = (side: 'p1' | 'p2') => {
    const species = speciesNameOf(state[side], pokemonList);
    if (species) clearBuild(species);
    dispatch({ type: 'RESET_BUILD', payload: { side } });
  };

  const handleSaveOppTeam = async (sets: ParsedShowdownSet[]) => {
    const newMembers: PokemonConfig[] = [];
    const db = await getDb();
    const corrections: string[] = [];
    const errors: string[] = [];

    for (const set of sets.slice(0, 6)) {
      const speciesMatch = matchSpecies(set.species, pokemonList);
      if (!speciesMatch) {
        errors.push(`Pokémon: ${set.species}`);
        continue;
      }
      const p = speciesMatch.match;
      if (speciesMatch.isFuzzy) {
        corrections.push(`Pokémon: ${speciesMatch.originalQuery} ➔ ${speciesMatch.resolvedName}`);
      }

      let abilityResult: { nameEn: string | null; nameZh: string | null }[] = [];
      try {
        abilityResult = await db.select({ nameEn: abilities.nameEn, nameZh: abilities.nameZh })
          .from(pokemonAbilities)
          .innerJoin(abilities, eq(pokemonAbilities.abilityId, abilities.id))
          .where(eq(pokemonAbilities.pokemonId, p.id))
          .orderBy(pokemonAbilities.slot);
      } catch (e) {}

      const abilityNames = abilityResult.map(a => a.nameEn).filter((name): name is string => !!name);
      const candidateAbilities = abilityResult.flatMap(a => [a.nameEn, a.nameZh].filter((name): name is string => !!name));

      const resolvedAbility = set.ability ? matchAbility(set.ability, candidateAbilities) : null;
      if (set.ability && !resolvedAbility) {
        errors.push(`Ability: ${set.ability}`);
      }
      let activeAbility = abilityResult[0]?.nameEn || null;
      if (resolvedAbility) {
        const dbRow = abilityResult.find(r => r.nameEn === resolvedAbility.match || r.nameZh === resolvedAbility.match);
        if (dbRow?.nameEn) {
          activeAbility = dbRow.nameEn;
          if (resolvedAbility.isFuzzy || resolvedAbility.match === dbRow.nameZh) {
            corrections.push(`Ability: ${resolvedAbility.originalQuery} ➔ ${dbRow.nameEn}`);
          }
        }
      }

      const resolvedItem = set.item ? matchItem(set.item) : null;
      if (set.item && !resolvedItem) {
        errors.push(`Item: ${set.item}`);
      }
      let item = set.item;
      if (resolvedItem) {
        item = resolvedItem.match;
        if (resolvedItem.isFuzzy || resolvedItem.originalQuery !== resolvedItem.resolvedName) {
          corrections.push(`Item: ${resolvedItem.originalQuery} ➔ ${resolvedItem.resolvedName}`);
        }
      }

      const movesData: (MoveData | null)[] = [];
      for (const mName of set.moves) {
        const mm = matchMove(mName, moveList);
        if (mm) {
          if (mm.isFuzzy || mm.originalQuery !== mm.resolvedName) {
            corrections.push(`Move: ${mm.originalQuery} ➔ ${mm.resolvedName}`);
          }
          movesData.push(mm.match);
        } else {
          errors.push(`Move: ${mName}`);
          movesData.push(null);
        }
      }
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
        activeAbility,
        item,
        hpPercent: 100,
        isTypeOverridden: false,
      });
    }

    if (errors.length > 0) {
      alert(`The following terms could not be recognized:\n${errors.join('\n')}`);
    }

    if (newMembers.length === 0) {
      alert('Could not find any Pokémon from the scanned team in our database.');
      return;
    }

    const teamName = sets[0].species + "'s Team";
    await createTeam(teamName, newMembers);

    if (corrections.length > 0) {
      window.dispatchEvent(new CustomEvent('showdown-imported', { detail: { side: 'opponent-scan', corrections } }));
    }
  };

  if (isMobile) {
    return (
      <>
        <ArenaCalculator
          state={state}
          dispatch={dispatch}
          pokemonList={pokemonList}
          moveList={moveList}
          p1Results={p1Results}
          p2Results={p2Results}
          p1MaxHp={p1MaxHp}
          p2MaxHp={p2MaxHp}
          actions={actions}
          onApplySpread={handleApplySpread}
          onResetBuild={handleResetBuild}
          onOpenScan={() => setIsScanModalOpen(true)}
        />
        <ScanTeamModal
          isOpen={isScanModalOpen}
          onClose={() => { setIsScanModalOpen(false); setCapturedBlob(null); }}
          pokemonList={pokemonList}
          onLoadPokemon={handleLoadDefender}
          onLoadAttacker={handleLoadAttacker}
          onSaveTeam={handleSaveOppTeam}
          externalBlob={capturedBlob}
        />
        <ToastNotification message={toast} />
      </>
    );
  }

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
          onApplySpread={handleApplySpread}
          onResetBuild={handleResetBuild}
        />
      }
      defenderPanel={
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <OneTapCaptureToggle onCaptured={handleCaptured} />
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
            onApplySpread={handleApplySpread}
            onResetBuild={handleResetBuild}
          />
        </div>
      }
    />
    <ScanTeamModal
      isOpen={isScanModalOpen}
      onClose={() => { setIsScanModalOpen(false); setCapturedBlob(null); }}
      pokemonList={pokemonList}
      onLoadPokemon={handleLoadDefender}
      onLoadAttacker={handleLoadAttacker}
      onSaveTeam={handleSaveOppTeam}
      externalBlob={capturedBlob}
    />
    <ToastNotification message={toast} />
    </>
  );
};

export default DamageCalculatorPage;
