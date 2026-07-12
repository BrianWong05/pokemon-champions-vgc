import { getDb } from '@/db';
import { abilities, pokemonAbilities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { PokemonPreset } from '@/features/pokemon/utils/pokemon-presets';
import { getNatureStats } from '@/features/pokemon/utils/pokemon-natures';
import { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import { matchSpecies, matchAbility, matchMove, matchItem } from '@/features/pokemon/utils/showdown-matcher';

export function useCalculatorActions(
  dispatch: React.Dispatch<CalcAction>,
  pokemonList: PokemonBaseStats[],
  moveList: MoveData[]
) {
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

  // Mega evolve / revert: swap species fields but keep the side's build
  // (moves, SP, nature, ranks, item, HP) — only the abilities refresh.
  const handleSwapForm = async (side: 'p1' | 'p2', p: PokemonBaseStats) => {
    dispatch({ type: 'SWAP_FORM', payload: { side, pokemon: p } });
    try {
      const db = await getDb();
      const abilityResult = await db.select({ name: abilities.nameEn })
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

  const handleSelectPreset = async (side: 'p1' | 'p2', preset: PokemonPreset) => {
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
    } catch (e) {}

    const movesData = preset.moves.map(mName => moveList.find(m => m.nameEn === mName) || null);
    const natureStats = getNatureStats(preset.nature);

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

  const handleImportShowdown = async (side: 'p1' | 'p2', set: ParsedShowdownSet) => {
    const corrections: string[] = [];

    const speciesMatch = matchSpecies(set.species, pokemonList);
    if (!speciesMatch) {
      alert(`Could not find Pokémon matching "${set.species}"`);
      return;
    }
    const p = speciesMatch.match;
    if (speciesMatch.isFuzzy) {
      corrections.push(`Pokémon: ${speciesMatch.originalQuery} ➔ ${speciesMatch.resolvedName}`);
    }

    let abilityResult: { nameEn: string | null; nameZh: string | null }[] = [];
    try {
      const db = await getDb();
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
      alert(`Could not find Ability matching "${set.ability}"`);
      return;
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
    let item = set.item;
    if (resolvedItem) {
      item = resolvedItem.match;
      if (resolvedItem.isFuzzy || resolvedItem.originalQuery !== resolvedItem.resolvedName) {
        corrections.push(`Item: ${resolvedItem.originalQuery} ➔ ${resolvedItem.resolvedName}`);
      }
    } else if (set.item) {
      alert(`Could not find Item matching "${set.item}"`);
      return;
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
        alert(`Could not find Move matching "${mName}"`);
        return;
      }
    }

    const natureStats = getNatureStats(set.nature);

    while (movesData.length < 4) {
      movesData.push(null);
    }

    const updatedSet = {
      ...set,
      species: p.nameEn,
      ability: activeAbility,
      item: item,
    };

    dispatch({
      type: 'IMPORT_SHOWDOWN_SET',
      payload: {
        side,
        pokemon: p,
        abilities: abilityNames,
        movesData: movesData.slice(0, 4),
        set: updatedSet,
        natureStats
      }
    });

    if (corrections.length > 0) {
      window.dispatchEvent(new CustomEvent('showdown-imported', { detail: { side, corrections } }));
    }

    return corrections;
  };

  const handleLoadConfig = async (side: 'p1' | 'p2', config: any) => {
    const p = pokemonList.find(p => p.id === config.selectedId);
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
    } catch (e) {}

    const movesData = config.moves.map((m: any) => m ? (moveList.find(move => move.nameEn === m.nameEn) || null) : null);
    const natureStats = getNatureStats(config.nature);

    while (movesData.length < 4) {
      movesData.push(null);
    }

    dispatch({
      type: 'LOAD_CONFIG',
      payload: {
        side,
        config,
        pokemon: p,
        abilities: abilityNames,
        movesData: movesData.slice(0, 4),
        natureStats
      }
    });
  };

  return { handleSelectPokemon, handleSwapForm, handleSelectPreset, handleImportShowdown, handleLoadConfig };
}
