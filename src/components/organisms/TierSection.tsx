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
}

const TierSection: React.FC<TierSectionProps> = ({ baseSpeed, pokemon }) => {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
      <TierHeader baseSpeed={baseSpeed} />
      
      <div className="divide-y">
        {/* Header for the grid */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 items-center">
          <div className="col-span-4 lg:col-span-5">
            <Typography variant="label">Pokemon</Typography>
          </div>
          <div className="col-span-1 text-center">
            <Typography variant="label">Base</Typography>
          </div>
          <div className="col-span-2 text-center">
            <Typography variant="label">Max+</Typography>
          </div>
          <div className="col-span-2 text-center">
            <Typography variant="label">Max</Typography>
          </div>
          <div className="col-span-3 lg:col-span-2 text-center">
            <Typography variant="label">Min-</Typography>
          </div>
        </div>

        {pokemon.map((p) => (
          <StatGridItem key={p.id} {...p} />
        ))}
      </div>
    </div>
  );
};

export default TierSection;
