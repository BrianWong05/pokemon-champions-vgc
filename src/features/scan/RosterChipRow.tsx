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
  /** Dashed `?` placeholder tiles rendered after the entry chips, for unrevealed roster slots. */
  unknownCount?: number;
  activeId?: number | null;
  onPick: (id: number) => void;
  onClear: () => void;
  pickAriaLabel: (name: string) => string;
  clearAriaLabel: string;
}

const RosterChipRow: React.FC<RosterChipRowProps> = ({ label, tone, entries, unknownCount, activeId, onPick, onClear, pickAriaLabel, clearAriaLabel }) => (
  <div className="mb-3">
    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-3">{label}</div>
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {entries.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onPick(e.id)}
          className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border ${
            activeId === e.id
              ? tone === 'danger'
                ? 'border-danger-line bg-danger-soft'
                : 'border-accent-soft-line bg-accent-soft'
              : 'border-line bg-transparent'
          }`}
          title={e.name}
          aria-label={pickAriaLabel(e.name)}
        >
          <PokemonImage id={e.id} name={e.name} className="w-9 h-9" />
        </button>
      ))}
      {Array.from({ length: unknownCount ?? 0 }).map((_, i) => (
        <div
          key={`unknown-${i}`}
          aria-label="Unrevealed opponent slot"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-dashed border-line-2 text-ink-4 font-display text-xs font-bold"
        >
          ?
        </div>
      ))}
      <button
        type="button"
        className="ml-auto shrink-0 px-1.5 py-0.5 text-ink-4 hover:text-danger"
        onClick={onClear}
        aria-label={clearAriaLabel}
        title={clearAriaLabel}
      >
        ✕
      </button>
    </div>
  </div>
);

export default RosterChipRow;
