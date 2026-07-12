// Format-scoped pokemon list for the overlay shell (confirm/strip views).
// ponytail: duplicates the pokemon half of DamageCalculatorPage's fetch;
// extract a shared hook if a third consumer appears.
import { useEffect, useState } from 'react';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats } from '@/db/schema';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

export function usePokemonList(format: string): PokemonBaseStats[] {
  const [list, setList] = useState<PokemonBaseStats[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await getDb();
        const rows = await db
          .select({
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
          .where(eq(formats.name, format));
        if (!cancelled) setList(rows as PokemonBaseStats[]);
      } catch (e) {
        console.error('[overlay] pokemon list load failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [format]);
  return list;
}
