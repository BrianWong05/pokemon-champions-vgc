import React, { useState, useEffect, useMemo } from 'react';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, calculatedSpeeds } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import SpeedTierTemplate from '@/components/templates/SpeedTierTemplate';
import TierSection from '@/components/organisms/TierSection';
import PokemonDetailModal, { FullPokemonDetail } from '@/components/organisms/PokemonDetailModal';

interface PokemonWithSpeeds {
  id: number;
  name: string;
  nameZh: string | null;
  baseSpeed: number;
  maxPlus: number;
  maxNeutral: number;
  uninvested: number;
  minMinus: number;
}

const SpeedTierPage: React.FC = () => {
  const [pokemonData, setPokemonData] = useState<PokemonWithSpeeds[]>([]);
  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(null);
  const [detailedPokemon, setDetailedPokemon] = useState<FullPokemonDetail | null>(null);
  const [otherForms, setOtherForms] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleSelectPokemon = (id: number) => {
    setSelectedPokemonId(id);
  };

  const handleCloseModal = () => {
    setSelectedPokemonId(null);
    setDetailedPokemon(null);
    setOtherForms([]);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedPokemonId) return;

      try {
        const database = await getDb();
        
        // 1. Fetch current pokemon details
        const [details] = await database
          .select()
          .from(pokemon)
          .where(eq(pokemon.id, selectedPokemonId));

        if (details) {
          setDetailedPokemon(details as FullPokemonDetail);

          // 2. Find other forms
          // Strategy: Match by base identifier (e.g., 'charizard' in 'charizard-mega-x')
          // Extract base name from identifier (before first dash)
          const baseId = details.identifier.split('-')[0];
          
          const forms = await database
            .select({
              id: pokemon.id,
              name: pokemon.nameEn,
            })
            .from(pokemon)
            .where(eq(pokemon.identifier, baseId)) // Base form
            .limit(20);

          const variants = await database
            .select({
              id: pokemon.id,
              name: pokemon.nameEn,
            })
            .from(pokemon)
            .where(
              sql`${pokemon.identifier} LIKE ${`${baseId}-%`}`
            )
            .limit(20);

          // Combine and filter unique IDs
          const allForms = [...forms, ...variants]
            .filter((v, i, self) => i === self.findIndex((t) => t.id === v.id))
            .map(f => ({ id: f.id, name: f.name || 'Unknown' }));

          setOtherForms(allForms);
        }
      } catch (error) {
        console.error('Error fetching pokemon details:', error);
      }
    };

    fetchDetails();
  }, [selectedPokemonId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const database = await getDb();
        const result = await database
          .select({
            id: pokemon.id,
            name: pokemon.nameEn,
            nameZh: pokemon.nameZh,
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
          onSelectPokemon={handleSelectPokemon}
        />
      ))}

      {detailedPokemon && (
        <PokemonDetailModal 
          pokemon={detailedPokemon} 
          otherForms={otherForms} 
          onClose={handleCloseModal}
          onFormSelect={handleSelectPokemon}
        />
      )}
    </SpeedTierTemplate>
  );
};

export default SpeedTierPage;
