import { getDb } from '@/db';
import { abilities, pokemonAbilities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { PokemonPreset } from '@/utils/pokemon-presets';
import { getNatureStats } from '@/utils/pokemon-natures';
import { ParsedShowdownSet } from '@/utils/showdown-parser';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { CalcAction } from './useCalculatorState';

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
      p = pokemonList.find(p => p.nameEn.toLowerCase() === prefix);
      
      if (!p) {
        p = pokemonList.find(p => p.nameEn.toLowerCase().includes(prefix));
      }
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
    const natureStats = getNatureStats(set.nature);

    while (movesData.length < 4) {
      movesData.push(null);
    }

    dispatch({
      type: 'IMPORT_SHOWDOWN_SET',
      payload: {
        side,
        pokemon: p,
        abilities: abilityNames,
        movesData: movesData.slice(0, 4),
        set,
        natureStats
      }
    });
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

  return { handleSelectPokemon, handleSelectPreset, handleImportShowdown, handleLoadConfig };
}
