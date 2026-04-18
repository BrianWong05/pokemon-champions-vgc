import React from 'react';
import Typography from '@/components/atoms/Typography';
import StatBar from '@/components/atoms/StatBar';
import FormItem from '@/components/molecules/FormItem';
import PokemonImage from '@/components/atoms/PokemonImage';
import TypeBadge from '@/components/atoms/TypeBadge';

export interface FullPokemonDetail {
  id: number;
  nameEn: string;
  nameZh: string | null;
  type1: string;
  type2: string | null;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpAtk: number;
  baseSpDef: number;
  baseSpeed: number;
}

interface PokemonDetailModalProps {
  pokemon: FullPokemonDetail;
  otherForms: { id: number; name: string }[];
  onClose: () => void;
  onFormSelect: (id: number) => void;
}

const PokemonDetailModal: React.FC<PokemonDetailModalProps> = ({ 
  pokemon, 
  otherForms, 
  onClose, 
  onFormSelect 
}) => {
  const statConfig = [
    { label: 'HP', value: pokemon.baseHp, color: 'bg-red-500' },
    { label: 'Atk', value: pokemon.baseAttack, color: 'bg-orange-500' },
    { label: 'Def', value: pokemon.baseDefense, color: 'bg-yellow-500' },
    { label: 'SpA', value: pokemon.baseSpAtk, color: 'bg-blue-400' },
    { label: 'SpD', value: pokemon.baseSpDef, color: 'bg-green-500' },
    { label: 'Spe', value: pokemon.baseSpeed, color: 'bg-pink-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <PokemonImage id={pokemon.id} name={pokemon.nameEn} className="w-20 h-20" />
            <div>
              <Typography variant="h1" className="text-2xl leading-tight">
                {pokemon.nameEn}
              </Typography>
              <div className="flex items-center space-x-2 mt-1">
                {pokemon.nameZh && (
                  <span className="text-gray-500 font-medium">
                    {pokemon.nameZh}
                  </span>
                )}
                <div className="flex space-x-1.5 ml-2">
                  <TypeBadge type={pokemon.type1} />
                  {pokemon.type2 && <TypeBadge type={pokemon.type2} />}
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-8">
          {/* Stats Section */}
          <section>
            <Typography variant="label" className="block mb-4 text-gray-400">Base Stats</Typography>
            <div className="space-y-4">
              {statConfig.map((stat) => (
                <StatBar key={stat.label} label={stat.label} value={stat.value} colorClass={stat.color} />
              ))}
            </div>
          </section>

          {/* Forms Section */}
          {otherForms.length > 0 && (
            <section className="pb-6">
              <Typography variant="label" className="block mb-4 text-gray-400">Other Forms</Typography>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {otherForms.map((f) => (
                  <FormItem 
                    key={f.id} 
                    id={f.id} 
                    name={f.name} 
                    isSelected={f.id === pokemon.id}
                    onClick={onFormSelect}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default PokemonDetailModal;
