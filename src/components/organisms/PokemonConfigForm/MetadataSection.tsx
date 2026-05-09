import React from 'react';
import { TYPE_IDS } from '@/utils/pokemon-types';
import { NATURES } from '@/utils/pokemon-natures';
import { AEGISLASH_ID } from '@/hooks/usePokemonEditor';

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
    <div className="pt-4 border-t border-gray-50 flex flex-col gap-4">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
            Ability & Nature
          </label>
          {selectedId === AEGISLASH_ID && onToggleAegislashForm && (
            <button
              onClick={onToggleAegislashForm}
              className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border transition-all ${
                form === 'Blade' 
                  ? 'bg-red-500 border-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]' 
                  : 'bg-blue-600 border-blue-700 text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]'
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
              className="flex-1 h-9 bg-gray-50 border border-gray-100 rounded-xl px-3 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {abilities.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select 
              value={nature} 
              onChange={(e) => onNatureChange(e.target.value)}
              className="flex-1 h-9 bg-gray-50 border border-gray-100 rounded-xl px-3 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!hideTypeOverride && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Manual Type Override</label>
            <input 
              type="checkbox" 
              checked={isTypeOverridden} 
              onChange={onToggleTypeOverride}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          {isTypeOverridden && (
            <div className="flex gap-2">
              <select 
                value={type1 || ''} 
                onChange={(e) => onTypeChange(1, e.target.value)}
                className="flex-1 h-9 bg-amber-50/50 border border-amber-100 rounded-xl px-3 text-xs font-bold text-amber-700 outline-none"
              >
                {Object.keys(TYPE_IDS).map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
              <select 
                value={type2 || 'none'} 
                onChange={(e) => onTypeChange(2, e.target.value === 'none' ? null : e.target.value)}
                className="flex-1 h-9 bg-amber-50/50 border border-amber-100 rounded-xl px-3 text-xs font-bold text-amber-700 outline-none"
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
