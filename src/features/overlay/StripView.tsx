// Docked bottom strip over the game (window state 'strip'): the locked
// opponent roster; tap sets the active defender and opens the calculator.
import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface StripViewProps {
  roster: number[];
  byId: Map<number, PokemonBaseStats>;
  activeId: number | null;
  onPick: (id: number) => void;
}

const StripView: React.FC<StripViewProps> = ({ roster, byId, activeId, onPick }) => (
  <div className="w-full h-screen flex items-end justify-center gap-2 pb-1 bg-gradient-to-t from-black/80 to-transparent">
    {roster.map((id) => {
      const name = byId.get(id)?.nameEn ?? `#${id}`;
      const active = id === activeId;
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
        </button>
      );
    })}
  </div>
);

export default StripView;
