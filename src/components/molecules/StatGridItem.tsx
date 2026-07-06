import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import StatValue from '@/components/molecules/StatValue';

interface StatGridItemProps {
  id: number;
  name: string;
  nameZh: string | null;
  baseSpeed: number;
  maxPlus: number;
  maxNeutral: number;
  uninvested: number;
  minMinus: number;
  onSelect: (id: number) => void;
}

const StatGridItem: React.FC<StatGridItemProps> = ({ 
  id, 
  name, 
  nameZh,
  baseSpeed,
  maxPlus, 
  maxNeutral, 
  minMinus,
  onSelect
}) => {
  return (
    <div 
      className="flex flex-col p-3 border border-line rounded-md hover:bg-raise transition-colors cursor-pointer bg-card"
      onClick={() => onSelect(id)}
    >
      <div className="flex items-center space-x-3 mb-2">
        <div className="flex-shrink-0">
          <PokemonImage id={id} name={name} />
        </div>
        <div className="flex flex-col truncate flex-grow">
          <span className="font-medium text-ink-1 truncate text-sm">{name}</span>
          {nameZh && (
            <span className="text-xs text-ink-3 truncate leading-tight">
              {nameZh}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-auto border-t border-line pt-2">
        <div className="text-center flex flex-col justify-between">
          <span className="text-[10px] text-ink-4 uppercase tracking-wider mb-0.5">Max+</span>
          <StatValue value={maxPlus} colorVariant="red" isBold />
        </div>
        <div className="text-center flex flex-col justify-between">
          <span className="text-[10px] text-ink-4 uppercase tracking-wider mb-0.5">Max</span>
          <StatValue value={maxNeutral} colorVariant="orange" isBold />
        </div>
        <div className="text-center flex flex-col justify-between">
          <span className="text-[10px] text-ink-4 uppercase tracking-wider mb-0.5">Min-</span>
          <StatValue value={minMinus} colorVariant="blue" />
        </div>
      </div>
    </div>
  );
};

export default StatGridItem;
