import React from 'react';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import ItemSearchSelect from '@/components/molecules/ItemSearchSelect';
import PokemonImage from '@/components/atoms/PokemonImage';
import ItemImage from '@/components/atoms/ItemImage';
import { AEGISLASH_ID } from '@/features/pokemon/hooks/usePokemonEditor';

interface TopSectionProps {
  title?: string;
  selectedId: number | null;
  selectedPokemon?: PokemonBaseStats;
  form?: 'Shield' | 'Blade';
  pokemonList: PokemonBaseStats[];
  item: string | null;
  onSelectPokemon: (p: PokemonBaseStats) => void;
  onItemChange: (item: string | null) => void;
}

export const TopSection: React.FC<TopSectionProps> = ({
  title,
  selectedId,
  selectedPokemon,
  form,
  pokemonList,
  item,
  onSelectPokemon,
  onItemChange
}) => {
  return (
    <div className="flex items-center gap-4">
      {/* Pokemon Avatar */}
      <div className="w-16 h-16 bg-inset rounded-2xl flex items-center justify-center border border-line shrink-0 overflow-hidden">
        {selectedId ? (
          <PokemonImage id={selectedId} name={selectedPokemon?.nameEn || ''} className="w-12 h-12 object-contain" />
        ) : (
          <div className="w-10 h-10 bg-raise rounded-full" />
        )}
      </div>

      {/* Search Inputs */}
      <div className="flex-1 grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-ink-3 uppercase tracking-widest block px-0.5">
            SELECT {title?.toUpperCase() || "POKÉMON 1"}
          </label>
          <PokemonSearchSelect
            label=""
            pokemonList={pokemonList}
            selectedPokemonName={selectedPokemon
              ? (selectedPokemon.id === AEGISLASH_ID && form
                  ? `${selectedPokemon.nameEn} (${form})`
                  : selectedPokemon.nameEn)
              : undefined}
            onSelect={onSelectPokemon}
          />
        </div>

        <div className="flex items-end gap-2">
          <div className="w-10 h-10 bg-inset rounded-xl flex items-center justify-center border border-line shrink-0 overflow-hidden">
            {item && item !== 'None' ? (
              <ItemImage name={item} className="w-8 h-8 object-contain" />
            ) : (
              <span className="text-ink-4 font-bold text-sm">?</span>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-end">
            <ItemSearchSelect
              label="HOLD ITEM"
              selectedItem={item}
              onSelect={onItemChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
