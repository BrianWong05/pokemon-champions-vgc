import React from 'react';
import TierHeader from '@/components/molecules/TierHeader';
import StatGridItem from '@/components/molecules/StatGridItem';
import Typography from '@/components/atoms/Typography';

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

interface TierSectionProps {
  baseSpeed: number;
  pokemon: PokemonWithSpeeds[];
  onSelectPokemon: (id: number) => void;
}

const TierSection: React.FC<TierSectionProps> = ({ baseSpeed, pokemon, onSelectPokemon }) => {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-gray-50/50">
      <TierHeader baseSpeed={baseSpeed} />
      
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {pokemon.map((p) => (
          <StatGridItem key={p.id} {...p} onSelect={onSelectPokemon} />
        ))}
      </div>
    </div>
  );
};

export default TierSection;
