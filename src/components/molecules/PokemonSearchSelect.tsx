import React, { useState, useMemo, useRef, useEffect } from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';

export interface PokemonBaseStats {
  id: number;
  identifier: string;
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
  selectedPokemonName?: string | null;
  onSelect: (pokemon: PokemonBaseStats) => void;
  className?: string;
}

const PokemonSearchSelect: React.FC<PokemonSearchSelectProps> = ({ 
  label, 
  pokemonList, 
  selectedPokemonName,
  onSelect, 
  className = '' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredPokemon = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    const results = pokemonList
      .filter(p => 
        p.nameEn.toLowerCase().includes(term) || 
        (p.nameZh && p.nameZh.includes(term)) ||
        p.identifier.toLowerCase().includes(term)
      )
      .slice(0, 50);
    setActiveIndex(results.length > 0 ? 0 : -1);
    return results;
  }, [searchTerm, pokemonList]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredPokemon.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredPokemon.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredPokemon.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        onSelect(filteredPokemon[activeIndex]);
        setSearchTerm('');
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="text-xs font-bold text-ink-3 uppercase tracking-wider mb-1 block">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={selectedPokemonName || "Search Pokemon..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className={`w-full px-3 py-2 bg-inset border border-line-2 rounded-md focus:ring-accent focus:border-accent font-medium text-sm ${!searchTerm && selectedPokemonName ? 'text-accent' : 'text-ink-1'}`}
          />
          {isOpen && filteredPokemon.length > 0 && (
            <div
              ref={scrollContainerRef}
              className="absolute z-10 w-full mt-1 bg-card border border-line rounded-md shadow-[var(--shadow-pop)] max-h-60 overflow-y-auto"
            >
              {filteredPokemon.map((p, index) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelect(p);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors border-b last:border-0 border-line ${index === activeIndex ? 'bg-accent-soft text-accent' : 'hover:bg-raise text-ink-1'}`}
                >
                  <PokemonImage id={p.id} name={p.nameEn} className="w-8 h-8" />
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${index === activeIndex ? 'text-accent' : 'text-ink-1'}`}>{p.nameEn}</span>
                    {p.nameZh && <span className={`text-[10px] leading-tight ${index === activeIndex ? 'text-accent' : 'text-ink-3'}`}>{p.nameZh}</span>}
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
