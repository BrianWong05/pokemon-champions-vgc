import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import StatValue from '@/components/atoms/StatValue';

interface StatGridItemProps {
  id: number;
  name: string;
  maxPlus: number;
  maxNeutral: number;
  uninvested: number;
  minMinus: number;
}

const StatGridItem: React.FC<StatGridItemProps> = ({ 
  id, 
  name, 
  maxPlus, 
  maxNeutral, 
  uninvested, 
  minMinus 
}) => {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-blue-50/30 transition-colors">
      <div className="col-span-4 lg:col-span-5 flex items-center space-x-3">
        <PokemonImage id={id} name={name} />
        <span className="font-medium text-gray-900 truncate">{name}</span>
      </div>
      
      <div className="col-span-2 text-center">
        <StatValue value={maxPlus} colorVariant="red" isBold />
      </div>
      <div className="col-span-2 text-center">
        <StatValue value={maxNeutral} colorVariant="orange" isBold />
      </div>
      <div className="col-span-2 text-center">
        <StatValue value={uninvested} colorVariant="gray" />
      </div>
      <div className="col-span-2 lg:col-span-1 text-center">
        <StatValue value={minMinus} colorVariant="blue" />
      </div>
    </div>
  );
};

export default StatGridItem;
