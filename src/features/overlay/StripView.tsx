// Docked bottom strip over the game (window state 'strip'): the locked
// opponent roster; tap sets the active defender for the next calc open.
import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface StripViewProps {
  roster: number[];
  byId: Map<number, PokemonBaseStats>;
  hpById: Record<number, number>;
  activeId: number | null;
  onPick: (id: number) => void;
}

const StripView: React.FC<StripViewProps> = ({ roster, byId, hpById, activeId, onPick }) => (
  <div className="w-full h-screen flex items-end justify-center gap-2 pb-1 bg-gradient-to-t from-black/80 to-transparent">
    {roster.map((id) => {
      const name = byId.get(id)?.nameEn ?? `#${id}`;
      const active = id === activeId;
      const hp = hpById[id];
      return (
        <button
          key={id}
          aria-label={`Set ${name} as defender`}
          aria-pressed={active}
          onClick={() => onPick(id)}
          className={`relative rounded-lg p-0.5 border-2 transition-transform ${
            active ? 'border-blue-400 bg-blue-500/20 -translate-y-1' : 'border-rose-500/50 bg-slate-900/90'
          }`}
        >
          <PokemonImage id={id} name={name} className="w-10 h-10" />
          {hp != null && (
            <span className="absolute -top-2 -right-1 text-[9px] font-bold px-1 rounded-full bg-slate-950 text-emerald-400 border border-emerald-500/50">
              {hp}%
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default StripView;
