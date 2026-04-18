import { getDb } from '../db';
import { pokemon, formatPokemon, formats, calculatedSpeeds } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface SpeedBenchmarks {
  maxPlus: number;
  maxNeutral: number;
  uninvested: number;
  minMinus: number;
}

export interface PokemonWithSpeeds {
  id: number;
  name: string;
  baseSpeed: number;
  speeds: SpeedBenchmarks;
}

export const fetchRegulationMAPokemonSpeed = async (): Promise<PokemonWithSpeeds[]> => {
  const db = await getDb();
  const result = await db
    .select({
      id: pokemon.id,
      name: pokemon.nameEn,
      baseSpeed: pokemon.baseSpeed,
      maxPlus: calculatedSpeeds.maxPlus,
      maxNeutral: calculatedSpeeds.maxNeutral,
      uninvested: calculatedSpeeds.uninvested,
      minMinus: calculatedSpeeds.minMinus,
    })
    .from(pokemon)
    .innerJoin(formatPokemon, eq(pokemon.id, formatPokemon.pokemonId))
    .innerJoin(formats, eq(formatPokemon.formatId, formats.id))
    .innerJoin(calculatedSpeeds, eq(pokemon.id, calculatedSpeeds.pokemonId))
    .where(eq(formats.name, 'Regulation M-A'))
    .orderBy(desc(pokemon.baseSpeed));

  return result.map((row: any) => ({
    id: row.id,
    name: row.name || 'Unknown',
    baseSpeed: row.baseSpeed,
    speeds: {
      maxPlus: row.maxPlus,
      maxNeutral: row.maxNeutral,
      uninvested: row.uninvested,
      minMinus: row.minMinus,
    },
  }));
};
