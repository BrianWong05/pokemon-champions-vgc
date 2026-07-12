// Team-preview confirm panel (window state 'panel'): 6 detected mons with
// confidence, tap a card to fix from candidates or full search, confirm
// locks the roster. Parent remounts (key) per scan.
import React, { useMemo, useState } from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import PokemonImagePicker from '../scan/PokemonImagePicker';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { SlotResult } from '../scan/types';

interface ConfirmRosterViewProps {
  slots: SlotResult[];
  pokemonList: PokemonBaseStats[];
  onConfirm: (ids: number[]) => void;
  onRescan: () => void;
  onClose: () => void;
}

const pct = (score: number) => `${Math.max(0, Math.min(99, Math.round(score * 100)))}%`;

const ConfirmRosterView: React.FC<ConfirmRosterViewProps> = ({ slots, pokemonList, onConfirm, onRescan, onClose }) => {
  const byId = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);
  const [picks, setPicks] = useState<(number | null)[]>(() => slots.map((s) => s.candidates[0]?.id ?? null));
  const [fixing, setFixing] = useState<number | null>(null);
  const [searchAll, setSearchAll] = useState(false);

  const nameOf = (id: number | null) => (id == null ? 'Unknown' : byId.get(id)?.nameEn ?? `#${id}`);
  const setPick = (slotIdx: number, id: number) => {
    setPicks((prev) => prev.map((p, i) => (i === slotIdx ? id : p)));
    setFixing(null);
    setSearchAll(false);
  };
  const ids = picks.filter((p): p is number => p != null);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/95 text-slate-100">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-slate-800 shrink-0">
        <span className="text-xs font-bold">Confirm opponent roster</span>
        <span className="flex-1" />
        <button aria-label="Re-scan team" onClick={onRescan} className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
          Re-scan
        </button>
        <button aria-label="Minimize" onClick={onClose} className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
          ▾
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className="grid grid-cols-3 gap-2">
          {slots.map((s, i) => {
            const low = (s.candidates[0]?.score ?? 0) < 0.75;
            const manual = picks[i] != null && picks[i] !== s.candidates[0]?.id;
            return (
              <button
                key={i}
                aria-label={`Fix ${nameOf(picks[i])}`}
                onClick={() => { setFixing(fixing === i ? null : i); setSearchAll(false); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${
                  fixing === i ? 'border-blue-400 bg-blue-500/10' : low && !manual ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800 bg-slate-900'
                }`}
              >
                {picks[i] != null && <PokemonImage id={picks[i]!} name={nameOf(picks[i])} className="w-12 h-12" />}
                <span className="text-[11px] font-semibold truncate max-w-full">{nameOf(picks[i])}</span>
                <span className={`text-[10px] font-bold ${manual ? 'text-blue-400' : low ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {manual ? 'Set' : s.candidates[0] ? pct(s.candidates[0].score) : '—'}
                </span>
              </button>
            );
          })}
        </div>

        {fixing != null && (
          <div className="mt-3 p-2 rounded-lg border border-slate-800 bg-slate-900">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Fix this slot</div>
            <div className="flex flex-wrap gap-2">
              {slots[fixing].candidates.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  aria-label={`Use ${nameOf(c.id)}`}
                  onClick={() => setPick(fixing, c.id)}
                  className={`flex items-center gap-2 px-2 py-1 rounded border ${picks[fixing] === c.id ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700'}`}
                >
                  <PokemonImage id={c.id} name={nameOf(c.id)} className="w-7 h-7" />
                  <span className="text-[11px]">{nameOf(c.id)}</span>
                  <span className="text-[10px] text-slate-400">{pct(c.score)}</span>
                </button>
              ))}
              <button onClick={() => setSearchAll((v) => !v)} className="text-[11px] px-2 py-1 rounded border border-dashed border-slate-600 text-slate-300">
                Search all…
              </button>
            </div>
            {searchAll && (
              <div className="mt-2 max-h-48 overflow-y-auto">
                <PokemonImagePicker pokemonList={pokemonList} selectedId={picks[fixing]} onSelect={(id) => setPick(fixing, id)} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 shrink-0 border-t border-slate-800">
        <button
          disabled={ids.length === 0}
          onClick={() => onConfirm(ids)}
          className="w-full h-10 rounded-lg font-bold text-sm bg-blue-500 text-slate-950 disabled:opacity-40"
        >
          Confirm &amp; lock roster
        </button>
      </div>
    </div>
  );
};

export default ConfirmRosterView;
