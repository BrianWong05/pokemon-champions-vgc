import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, moves, pokemonAbilities, abilities } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { MoveData } from '@/components/molecules/MoveSearchSelect';

export const pokemonRepository = {
  async getPokemonListByFormat(formatName: string = 'Regulation M-A'): Promise<PokemonBaseStats[]> {
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
      ability1Id: pokemonAbilities.ability1Id,
      ability2Id: pokemonAbilities.ability2Id,
      abilityHiddenId: pokemonAbilities.abilityHiddenId,
    })
    .from(pokemonAbilities)
    .where(eq(pokemonAbilities.pokemonId, pokemonId));

    if (abilityResult.length === 0) return [];

    const { ability1Id, ability2Id, abilityHiddenId } = abilityResult[0];
    const abilityIds = [ability1Id, ability2Id, abilityHiddenId].filter((id): id is number => id !== null);

    if (abilityIds.length === 0) return [];

    const namesResult = await db.select({ name: abilities.nameEn })
      .from(abilities)
      .where(inArray(abilities.id, abilityIds));

    return namesResult.map(r => r.name);
  }
};
