import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, moves, pokemonAbilities, abilities } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { DEFAULT_FORMAT } from '@/features/formats/format-utils';

export const pokemonRepository = {
  async getPokemonListByFormat(formatName: string = DEFAULT_FORMAT): Promise<PokemonBaseStats[]> {
    const db = await getDb();
    const result = await db.select({
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
    .where(eq(formats.name, formatName));
    
    return result as PokemonBaseStats[];
  },

  async getAllMoves(): Promise<MoveData[]> {
    const db = await getDb();
    const result = await db.select().from(moves);
    return result as MoveData[];
  },

  async getPokemonAbilities(pokemonId: number): Promise<string[]> {
    const db = await getDb();
    const abilityResult = await db.select({
      name: abilities.nameEn
    })
    .from(pokemonAbilities)
    .innerJoin(abilities, eq(pokemonAbilities.abilityId, abilities.id))
    .where(eq(pokemonAbilities.pokemonId, pokemonId))
    .orderBy(pokemonAbilities.slot);

    return abilityResult.map(r => r.name).filter((name): name is string => !!name);
  }
};
