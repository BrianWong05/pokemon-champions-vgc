import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';

interface FormItemProps {
  id: number;
  name: string;
  isSelected?: boolean;
  onClick: (id: number) => void;
}

const FormItem: React.FC<FormItemProps> = ({ id, name, isSelected = false, onClick }) => {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex flex-col items-center p-2 rounded-lg transition-all border ${
        isSelected
          ? 'bg-accent-soft border-accent-soft-line'
          : 'border-transparent hover:bg-raise hover:border-line'
      }`}
    >
      <PokemonImage id={id} name={name} className="w-12 h-12 mb-1" />
      <span className={`text-[10px] text-center leading-tight font-medium ${
        isSelected ? 'text-accent' : 'text-ink-3'
      }`}>
        {name}
      </span>
    </button>
  );
};

export default FormItem;
