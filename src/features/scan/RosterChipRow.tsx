// Shared presentational chip row for the calculator panels: a labeled,
// horizontally scrollable strip of tappable Pokémon sprites with an ✕ at
// the end. Both the opponent roster and the user's own team render this.
import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';

export interface ChipEntry {
  id: number;
  name: string;
}

interface RosterChipRowProps {
  label: string;
  tone: 'danger' | 'accent';
  entries: ChipEntry[];
  activeId?: number | null;
  onPick: (id: number) => void;
  onClear: () => void;
  pickAriaLabel: (name: string) => string;
  clearAriaLabel: string;
}

const RosterChipRow: React.FC<RosterChipRowProps> = ({ label, tone, entries, activeId, onPick, onClear, pickAriaLabel, clearAriaLabel }) => (
  <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-lg border border-line-2 bg-inset p-1">
    <span className={`px-1 text-[10px] font-semibold ${tone === 'danger' ? 'text-danger' : 'text-accent'}`}>{label}</span>
    {entries.map((e) => (
      <button
        key={e.id}
        type="button"
        onClick={() => onPick(e.id)}
        className={`shrink-0 rounded-lg border p-0.5 ${activeId === e.id ? 'border-transparent bg-accent-soft ring-2 ring-accent' : 'border-line bg-card'}`}
        title={e.name}
        aria-label={pickAriaLabel(e.name)}
      >
        <PokemonImage id={e.id} name={e.name} className="w-8 h-8" />
      </button>
    ))}
    <button
      type="button"
      className="ml-auto shrink-0 px-1.5 py-0.5 text-danger hover:bg-danger-soft rounded"
      onClick={onClear}
      aria-label={clearAriaLabel}
      title={clearAriaLabel}
    >
      ✕
    </button>
  </div>
);

export default RosterChipRow;
