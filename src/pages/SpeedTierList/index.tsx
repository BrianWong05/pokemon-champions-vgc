import React, { useState, useEffect, useMemo } from 'react';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, calculatedSpeeds } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import SpeedTierTemplate from '@/components/templates/SpeedTierTemplate';
import TierSection from '@/components/organisms/TierSection';

interface PokemonWithSpeeds {
  id: number;
  name: string;
  baseSpeed: number;
  maxPlus: number;
  maxNeutral: number;
  uninvested: number;
  minMinus: number;
}

const SpeedTierPage: React.FC = () => {
  const [pokemonData, setPokemonData] = useState<PokemonWithSpeeds[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const database = await getDb();
        const result = await database
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

        setPokemonData(result.map((row: any) => ({
          ...row,
          name: row.name || 'Unknown'
        })));
      } catch (error) {
        console.error('Error fetching speed tiers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const groupedPokemon = useMemo(() => {
    const groups: Record<number, PokemonWithSpeeds[]> = {};

    pokemonData.forEach((p) => {
      if (!groups[p.baseSpeed]) {
        groups[p.baseSpeed] = [];
      }
      groups[p.baseSpeed].push(p);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a)) // Sort base speed descending
      .map(([baseSpeed, pokemon]) => ({
        baseSpeed: Number(baseSpeed),
        pokemon,
      }));
  }, [pokemonData]);

  return (
    <SpeedTierTemplate 
      title="Regulation M-A Speed Tiers"
      isLoading={isLoading}
      isEmpty={groupedPokemon.length === 0}
      emptyMessage="No speed data found for Regulation M-A."
    >
      {groupedPokemon.map((group) => (
        <TierSection 
          key={group.baseSpeed} 
          baseSpeed={group.baseSpeed} 
          pokemon={group.pokemon} 
        />
      ))}
    </SpeedTierTemplate>
  );
};

export default SpeedTierPage;
