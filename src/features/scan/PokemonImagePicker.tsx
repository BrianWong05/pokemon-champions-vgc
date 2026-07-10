import React, { useMemo, useState } from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface PokemonImagePickerProps {
  pokemonList: PokemonBaseStats[];
  selectedId: number | null;
  disabledIds?: ReadonlySet<number>;
  onSelect: (id: number) => void;
}

const MAX_RESULTS = 60;

const PokemonImagePicker: React.FC<PokemonImagePickerProps> = ({
  pokemonList,
  selectedId,
  disabledIds,
  onSelect,
}) => {
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
    <div className="bg-card border border-line rounded-xl p-3">
      <input
        className="w-full h-10 bg-inset border border-line-2 rounded-lg px-3 mb-3 text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-accent"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 max-h-72 overflow-y-auto">
        {filtered.map((p) => {
          const disabled = disabledIds?.has(p.id) ?? false;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(p.id)}
              title={`${p.nameEn}${p.nameZh ? ` · ${p.nameZh}` : ''}${disabled ? ' · Already selected' : ''}`}
              className={`flex flex-col items-center gap-1 rounded-lg p-1.5 ${
                disabled
                  ? 'cursor-not-allowed opacity-40'
                  : selectedId === p.id
                    ? 'bg-accent-soft ring-2 ring-accent'
                    : 'hover:bg-raise'
              }`}
            >
              <PokemonImage id={p.id} name={p.nameEn} className="w-16 h-16" />
              <span
                className={`w-full text-[11px] leading-tight text-center truncate ${
                  selectedId === p.id ? 'text-accent' : 'text-ink-3'
                }`}
              >
                {p.nameEn}
              </span>
            </button>
          );
        })}
      </div>
      {filtered.length === MAX_RESULTS && (
        <p className="text-xs text-ink-4 mt-2">Showing first {MAX_RESULTS} — refine your search.</p>
      )}
    </div>
  );
};

export default PokemonImagePicker;
