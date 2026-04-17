import { db } from '../db';
import { pokemon, formatPokemon, formats } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

/**
 * Custom Pokemon Champions Speed formula: floor((Base + 20 + SP) * Nature)
 */
const calculateBenchmarks = (baseSpeed: number): SpeedBenchmarks => {
  return {
    // Max Speed (+Nature): 32 SP, Positive nature (1.1x)
    maxPlus: Math.floor((baseSpeed + 20 + 32) * 1.1),
    // Max Speed (Neutral): 32 SP, Neutral nature (1.0x)
    maxNeutral: Math.floor((baseSpeed + 20 + 32) * 1.0),
    // Uninvested Speed: 0 SP, Neutral nature (1.0x)
    uninvested: Math.floor((baseSpeed + 20 + 0) * 1.0),
    // Min Speed (-Nature): 0 SP, Negative nature (0.9x)
    minMinus: Math.floor((baseSpeed + 20 + 0) * 0.9),
  };
};

export const fetchRegulationMAPokemonSpeed = async (): Promise<PokemonWithSpeeds[]> => {
  const result = await db
    .select({
      id: pokemon.id,
      name: pokemon.nameEn,
      baseSpeed: pokemon.spe,
    })
    .from(pokemon)
    .innerJoin(formatPokemon, eq(pokemon.id, formatPokemon.pokemonId))
    .innerJoin(formats, eq(formatPokemon.formatId, formats.id))
    .where(eq(formats.name, 'Regulation M-A'))
    .orderBy(desc(pokemon.spe));

  return result.map((row) => ({
    id: row.id,
    name: row.name || 'Unknown',
    baseSpeed: row.baseSpeed,
    speeds: calculateBenchmarks(row.baseSpeed),
  }));
};
