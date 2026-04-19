import React, { useState, useMemo } from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';

export interface PokemonBaseStats {
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

interface PokemonSearchSelectProps {
  label: string;
  pokemonList: PokemonBaseStats[];
  onSelect: (pokemon: PokemonBaseStats) => void;
  className?: string;
}

const PokemonSearchSelect: React.FC<PokemonSearchSelectProps> = ({ 
  label, 
  pokemonList, 
  onSelect, 
  className = '' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredPokemon = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return pokemonList
      .filter(p => 
        p.nameEn.toLowerCase().includes(term) || 
        (p.nameZh && p.nameZh.includes(term))
      )
      .slice(0, 10);
  }, [searchTerm, pokemonList]);

  return (
    <div className={`relative ${className}`}>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search Pokemon..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium text-sm"
          />
          {isOpen && filteredPokemon.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredPokemon.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelect(p);
                    setSearchTerm(p.nameEn);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left transition-colors border-b last:border-0 border-gray-100"
                >
                  <PokemonImage id={p.id} name={p.nameEn} className="w-8 h-8" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900">{p.nameEn}</span>
                    {p.nameZh && <span className="text-[10px] text-gray-500 leading-tight">{p.nameZh}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default PokemonSearchSelect;
