// Floating battle-roster strip on the calculator: the opponent's confirmed
// six, one tap -> defender/attacker actions, ✕ ends the battle session.
import React, { useState } from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface OpponentRosterStripProps {
  roster: number[];
  byId: Map<number, PokemonBaseStats>;
  onSetDefender: (id: number) => void;
  onSetAttacker: (id: number) => void;
  onClear: () => void;
}

const OpponentRosterStrip: React.FC<OpponentRosterStripProps> = ({ roster, byId, onSetDefender, onSetAttacker, onClear }) => {
  const [activeId, setActiveId] = useState<number | null>(null);
  return (
    <div className="fixed bottom-20 right-3 z-40 md:bottom-6 rounded-xl border border-line-2 bg-card p-2 shadow-lg">
      <div className="flex items-center gap-1">
        <span className="px-1 text-[10px] font-semibold text-danger">Opp</span>
        {roster.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveId(activeId === id ? null : id)}
            className={`rounded-lg border p-0.5 ${activeId === id ? 'border-transparent bg-accent-soft ring-2 ring-accent' : 'border-line bg-inset'}`}
            title={byId.get(id)?.nameEn}
          >
            <PokemonImage id={id} name={byId.get(id)?.nameEn ?? 'pokemon'} className="w-9 h-9" />
          </button>
        ))}
        <button
          type="button"
          className="ml-1 px-1.5 py-0.5 text-danger hover:bg-danger-soft rounded"
          onClick={onClear}
          aria-label="End battle (clear opponent roster)"
          title="End battle"
        >
          ✕
        </button>
      </div>
      {activeId != null && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-ink-2 truncate">{byId.get(activeId)?.nameEn}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-2 py-1 text-xs font-semibold text-accent border border-accent-soft-line rounded hover:bg-accent-soft"
              onClick={() => { onSetDefender(activeId); setActiveId(null); }}
            >
              Set as defender
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs font-semibold text-safe border border-safe-line rounded hover:bg-safe-soft"
              onClick={() => { onSetAttacker(activeId); setActiveId(null); }}
            >
              Set as attacker
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpponentRosterStrip;
