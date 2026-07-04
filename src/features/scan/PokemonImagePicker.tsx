import React, { useMemo, useState } from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface PokemonImagePickerProps {
  pokemonList: PokemonBaseStats[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const MAX_RESULTS = 60;

const PokemonImagePicker: React.FC<PokemonImagePickerProps> = ({ pokemonList, selectedId, onSelect }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? pokemonList.filter(
          (p) =>
            p.nameEn.toLowerCase().includes(q) ||
            (p.nameZh ?? '').toLowerCase().includes(q) ||
            p.identifier.toLowerCase().includes(q),
        )
      : pokemonList;
    return list.slice(0, MAX_RESULTS);
  }, [pokemonList, query]);

  return (
    <div className="border rounded p-2">
      <input
        className="w-full border rounded p-1 mb-2 text-sm"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            title={p.nameEn}
            className={`flex flex-col items-center rounded p-0.5 hover:bg-blue-50 ${
              selectedId === p.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <PokemonImage id={p.id} name={p.nameEn} className="w-9 h-9" />
          </button>
        ))}
      </div>
      {filtered.length === MAX_RESULTS && (
        <p className="text-xs text-gray-400 mt-1">Showing first {MAX_RESULTS} — refine your search.</p>
      )}
    </div>
  );
};

export default PokemonImagePicker;
