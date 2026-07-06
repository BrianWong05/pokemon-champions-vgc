import React from 'react';
import { TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';
import { NATURES } from '@/features/pokemon/utils/pokemon-natures';
import { AEGISLASH_ID } from '@/features/pokemon/hooks/usePokemonEditor';

interface MetadataSectionProps {
  selectedId: number | null;
  form?: 'Shield' | 'Blade';
  activeAbility: string | null;
  abilities: string[];
  nature: string;
  isTypeOverridden: boolean;
  type1: string | null;
  type2: string | null;
  hideTypeOverride?: boolean;
  onAbilityChange: (ability: string) => void;
  onNatureChange: (nature: string) => void;
  onTypeChange: (slot: 1 | 2, type: string | null) => void;
  onToggleTypeOverride: () => void;
  onToggleAegislashForm?: () => void;
}

export const MetadataSection: React.FC<MetadataSectionProps> = ({
  selectedId,
  form,
  activeAbility,
  abilities,
  nature,
  isTypeOverridden,
  type1,
  type2,
  hideTypeOverride = false,
  onAbilityChange,
  onNatureChange,
  onTypeChange,
  onToggleTypeOverride,
  onToggleAegislashForm
}) => {
  return (
    <div className="pt-4 border-t border-line flex flex-col gap-4">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black text-ink-3 uppercase tracking-widest block">
            Ability & Nature
          </label>
          {selectedId === AEGISLASH_ID && onToggleAegislashForm && (
            <button
              onClick={onToggleAegislashForm}
              className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border transition-all ${
                form === 'Blade'
                  ? 'bg-danger-soft text-danger border-danger-line'
                  : 'bg-accent-soft text-accent border-accent-soft-line'
              }`}
            >
              Stance: {form || 'Shield'}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              value={activeAbility || ''}
              onChange={(e) => onAbilityChange(e.target.value)}
              className="flex-1 h-9 bg-inset border border-line rounded-xl px-3 text-xs font-bold text-ink-2 outline-none focus:ring-2 focus:ring-accent/20"
            >
              {abilities.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={nature}
              onChange={(e) => onNatureChange(e.target.value)}
              className="flex-1 h-9 bg-inset border border-line rounded-xl px-3 text-xs font-bold text-ink-2 outline-none focus:ring-2 focus:ring-accent/20"
            >
              {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!hideTypeOverride && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-ink-3 uppercase tracking-widest">Manual type override</label>
            <input
              type="checkbox"
              checked={isTypeOverridden}
              onChange={onToggleTypeOverride}
              className="w-3.5 h-3.5 rounded border-line-2 text-accent focus:ring-accent"
            />
          </div>
          {isTypeOverridden && (
            <div className="flex gap-2">
              <select
                value={type1 || ''}
                onChange={(e) => onTypeChange(1, e.target.value)}
                className="flex-1 h-9 bg-field-soft border border-field-line rounded-xl px-3 text-xs font-bold text-field outline-none"
              >
                {Object.keys(TYPE_IDS).map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
              <select
                value={type2 || 'none'}
                onChange={(e) => onTypeChange(2, e.target.value === 'none' ? null : e.target.value)}
                className="flex-1 h-9 bg-field-soft border border-field-line rounded-xl px-3 text-xs font-bold text-field outline-none"
              >
                <option value="none">NONE</option>
                {Object.keys(TYPE_IDS).map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
