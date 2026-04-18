import React, { useState, useEffect, useMemo } from 'react';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, calculatedSpeeds } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

interface PokemonWithSpeeds {
  id: number;
  name: string;
  baseSpeed: number;
  maxPlus: number;
  maxNeutral: number;
  uninvested: number;
  minMinus: number;
}

const SpeedTierList: React.FC = () => {
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl font-medium text-gray-600 animate-pulse">
          Loading speed tiers...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-900">
        Regulation M-A Speed Tiers
      </h1>
      
      {groupedPokemon.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No speed data found for Regulation M-A.
        </div>
      ) : (
        <div className="space-y-8">
          {groupedPokemon.map((group) => (
            <div key={group.baseSpeed} className="border rounded-lg overflow-hidden shadow-sm bg-white">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Base {group.baseSpeed}</h2>
              </div>
              
              <div className="divide-y">
                {/* Header for the grid */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider items-center">
                  <div className="col-span-4 lg:col-span-5">Pokemon</div>
                  <div className="col-span-2 text-center">Max+</div>
                  <div className="col-span-2 text-center">Max</div>
                  <div className="col-span-2 text-center">Neutral</div>
                  <div className="col-span-2 lg:col-span-1 text-center">Min-</div>
                </div>

                {group.pokemon.map((p) => (
                  <div key={p.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-blue-50/30 transition-colors">
                    <div className="col-span-4 lg:col-span-5 flex items-center space-x-3">
                      <img 
                        src={`${import.meta.env.BASE_URL}images/pokemon/thumbnails/${p.id}.png`} 
                        alt={p.name}
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
                        }}
                      />

                      <span className="font-medium text-gray-900 truncate">{p.name}</span>
                    </div>
                    
                    <div className="col-span-2 text-center font-bold text-red-600">
                      {p.maxPlus}
                    </div>
                    <div className="col-span-2 text-center font-semibold text-orange-600">
                      {p.maxNeutral}
                    </div>
                    <div className="col-span-2 text-center text-gray-700">
                      {p.uninvested}
                    </div>
                    <div className="col-span-2 lg:col-span-1 text-center text-blue-600">
                      {p.minMinus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpeedTierList;
