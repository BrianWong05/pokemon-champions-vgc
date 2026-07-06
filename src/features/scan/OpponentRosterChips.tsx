// Compact battle-roster chip row rendered inside the Defender panel: the
// opponent's confirmed six, one tap -> load as defender, ✕ ends the session.
import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface OpponentRosterChipsProps {
  roster: number[];
  byId: Map<number, PokemonBaseStats>;
  /** Current defender species id — its chip gets the selected ring. */
  activeId?: number | null;
  onPick: (id: number) => void;
  onClear: () => void;
}

const OpponentRosterChips: React.FC<OpponentRosterChipsProps> = ({ roster, byId, activeId, onPick, onClear }) => (
  <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-lg border border-line-2 bg-inset p-1">
    <span className="px-1 text-[10px] font-semibold text-danger">Opp</span>
    {roster.map((id) => (
      <button
        key={id}
        type="button"
        onClick={() => onPick(id)}
        className={`shrink-0 rounded-lg border p-0.5 ${activeId === id ? 'border-transparent bg-accent-soft ring-2 ring-accent' : 'border-line bg-card'}`}
        title={byId.get(id)?.nameEn ?? `#${id}`}
        aria-label={`Set ${byId.get(id)?.nameEn ?? `#${id}`} as defender`}
      >
        <PokemonImage id={id} name={byId.get(id)?.nameEn ?? 'pokemon'} className="w-8 h-8" />
      </button>
    ))}
    <button
      type="button"
      className="ml-auto shrink-0 px-1.5 py-0.5 text-danger hover:bg-danger-soft rounded"
      onClick={onClear}
      aria-label="End battle (clear opponent roster)"
      title="End battle"
    >
      ✕
    </button>
  </div>
);

export default OpponentRosterChips;
