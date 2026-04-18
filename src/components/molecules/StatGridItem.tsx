import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import StatValue from '@/components/atoms/StatValue';

interface StatGridItemProps {
  id: number;
  name: string;
  nameZh: string | null;
  baseSpeed: number;
  maxPlus: number;
  maxNeutral: number;
  uninvested: number;
  minMinus: number;
}

const StatGridItem: React.FC<StatGridItemProps> = ({ 
  id, 
  name, 
  nameZh,
  baseSpeed,
  maxPlus, 
  maxNeutral, 
  minMinus 
}) => {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-blue-50/30 transition-colors">
      <div className="col-span-4 lg:col-span-5 flex items-center space-x-3">
        <PokemonImage id={id} name={name} />
        <div className="flex flex-col truncate">
          <span className="font-medium text-gray-900 truncate">{name}</span>
          {nameZh && (
            <span className="text-xs text-gray-500 truncate leading-tight">
              {nameZh}
            </span>
          )}
        </div>
      </div>

      <div className="col-span-1 text-center">
        <span className="text-sm font-bold text-gray-400">{baseSpeed}</span>
      </div>
      
      <div className="col-span-2 text-center">
        <StatValue value={maxPlus} colorVariant="red" isBold />
      </div>
      <div className="col-span-2 text-center">
        <StatValue value={maxNeutral} colorVariant="orange" isBold />
      </div>
      <div className="col-span-3 lg:col-span-2 text-center">
        <StatValue value={minMinus} colorVariant="blue" />
      </div>
    </div>
  );
};

export default StatGridItem;
