import { db } from '../src/db/node';
import { pokemon, formatPokemon, formats, calculatedSpeeds } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

const calculateBenchmarks = (baseSpeed: number) => {
  return {
    maxPlus: Math.floor((baseSpeed + 20 + 32) * 1.1),
    maxNeutral: Math.floor((baseSpeed + 20 + 32) * 1.0),
    uninvested: Math.floor((baseSpeed + 20 + 0) * 1.0),
    minMinus: Math.floor((baseSpeed + 20 + 0) * 0.9),
  };
};

async function seedCalculatedSpeeds() {
  console.log('--- Starting Pre-calculation for Regulation M-A Speed Benchmarks ---');

  try {
    // 1. Fetch all Pokemon legal in Regulation M-A
    const result = await db
      .select({
        id: pokemon.id,
        identifier: pokemon.identifier,
        baseSpeed: pokemon.baseSpeed,
      })
      .from(pokemon)
      .innerJoin(formatPokemon, eq(pokemon.id, formatPokemon.pokemonId))
      .innerJoin(formats, eq(formatPokemon.formatId, formats.id))
      .where(eq(formats.name, 'Regulation M-A'));

    console.log(`Found ${result.length} legal Pokemon for Regulation M-A.`);

    // 2. Map results to calculate benchmarks
    const insertData = result.map((p) => {
      const benchmarks = calculateBenchmarks(p.baseSpeed);
      return {
        pokemonId: p.id,
        ...benchmarks,
      };
    });

    // 3. Batch insert using onConflictDoUpdate for idempotency
    if (insertData.length > 0) {
      await db
        .insert(calculatedSpeeds)
        .values(insertData)
        .onConflictDoUpdate({
          target: calculatedSpeeds.pokemonId,
          set: {
            maxPlus: (calculatedSpeeds as any).maxPlus,
            maxNeutral: (calculatedSpeeds as any).maxNeutral,
            uninvested: (calculatedSpeeds as any).uninvested,
            minMinus: (calculatedSpeeds as any).minMinus,
          },
        });
      
      console.log(`✓ Successfully pre-calculated and stored speed benchmarks for ${insertData.length} Pokemon.`);
    } else {
      console.log('No Pokemon found to process.');
    }

  } catch (error) {
    console.error('✗ Error during pre-calculation seeding:', error);
    process.exit(1);
  }
}

seedCalculatedSpeeds();
