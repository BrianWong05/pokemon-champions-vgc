import React from 'react';
import Typography from '@/components/atoms/Typography';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import ItemSearchSelect from '@/components/molecules/ItemSearchSelect';
import PokemonImage from '@/components/atoms/PokemonImage';
import ItemImage from '@/components/atoms/ItemImage';
import TypeBadge from '@/components/atoms/TypeBadge';
import StatGrid from '@/components/molecules/StatGrid';
import MoveSearchSelect, { MoveData } from '@/components/molecules/MoveSearchSelect';
import { REVERSE_TYPE_IDS } from '@/utils/pokemon-types';
import { POKEMON_PRESETS, PokemonPreset, NATURES } from '@/utils/pokemon-presets';
import { PokemonConfig } from '@/hooks/usePokemonEditor';

interface PokemonConfigFormProps {
  config: PokemonConfig;
  pokemonList: PokemonBaseStats[];
  moveList: MoveData[];
  onSelectPokemon: (p: PokemonBaseStats) => void;
  onSelectPreset?: (preset: PokemonPreset) => void;
  onSpChange: (key: string, val: number) => void;
  onNatureChange: (nature: string) => void;
  onToggleNature: (stat: string, mod: '+' | '-') => void;
  onStageChange?: (stat: string, val: number) => void;
  onSelectMove: (index: number, m: MoveData) => void;
  onClearMove: (index: number) => void;
  onAbilityChange: (ability: string) => void;
  onItemChange: (item: string | null) => void;
  onTypeChange: (slot: 1 | 2, type: string | null) => void;
  onToggleTypeOverride: () => void;
  // Context-specific props
  title?: string;
  sideColor?: string;
  hideTypeOverride?: boolean;
  renderMoveActions?: (move: MoveData | null, index: number) => React.ReactNode;
}

const PokemonConfigForm: React.FC<PokemonConfigFormProps> = ({
  config, pokemonList, moveList, 
  onSelectPokemon, onSelectPreset, onSpChange, onNatureChange, onToggleNature, onStageChange,
  onSelectMove, onClearMove, onAbilityChange, onItemChange,
  onTypeChange, onToggleTypeOverride,
  title, sideColor, hideTypeOverride = false,
  renderMoveActions
}) => {
  const selectedPokemon = pokemonList.find(p => p.id === config.selectedId);
  const pokemonTypes = [config.type1, config.type2].filter((t): t is string => !!t).map(t => t.toLowerCase());
  
  const availablePresets = selectedPokemon 
    ? POKEMON_PRESETS.filter(p => p.pokemonName === selectedPokemon.nameEn)
    : [];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
      {/* 1. Title Bar */}
      <div className="flex items-center gap-3">
        <div className={`w-1.5 h-7 ${sideColor || 'bg-blue-600'} rounded-full`} />
        <h2 className="text-xl font-bold text-gray-800">{title || "Pokémon 1"}</h2>
      </div>

      {/* 2. Top Selection Row */}
      <div className="flex items-center gap-4">
        {/* Pokemon Avatar */}
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0 overflow-hidden">
          {config.selectedId ? (
            <PokemonImage id={config.selectedId} name={selectedPokemon?.nameEn || ''} className="w-12 h-12 object-contain" />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
          )}
        </div>

        {/* Search Inputs */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-0.5">
              SELECT {title?.toUpperCase() || "POKÉMON 1"}
            </label>
            <PokemonSearchSelect 
              label="" 
              pokemonList={pokemonList} 
              onSelect={onSelectPokemon}
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 shrink-0 mb-1">
              <span className="text-gray-300 font-bold text-sm">?</span>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-0.5">
                HOLD ITEM
              </label>
              <ItemSearchSelect
                label=""
                selectedItem={config.item}
                onSelect={onItemChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Stats Grid Section */}
      <div className="pt-2">
        <StatGrid 
          stats={{
            hp: { base: config.baseHp, sp: config.spHp },
            atk: { base: config.baseAtk, sp: config.spAtk },
            def: { base: config.baseDef, sp: config.spDef },
            spa: { base: config.baseSpa, sp: config.spSpa },
            spd: { base: config.baseSpd, sp: config.spSpd },
            spe: { base: config.baseSpe, sp: config.spSpe },
          }}
          boostedStat={config.boostedStat}
          hinderedStat={config.hinderedStat}
          onToggleNature={onToggleNature}
          onSpChange={onSpChange}
          onStageChange={onStageChange}
          // Assuming stages logic might be handled outside or added to config
          stages={ (config as any).stages || { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }
          ability={config.activeAbility}
          pokemonTypes={pokemonTypes}
        />
      </div>

      {/* 4. Move Pool Selection */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          MOVE POOL SELECTION
        </h3>
        <div className="space-y-2">
          {config.moves.map((move, idx) => (
            <div key={idx} className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
              <span className="text-[10px] font-black text-gray-300 w-4 text-center">{idx + 1}</span>
              <div className="flex-1">
                {move ? (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-blue-900 leading-tight">{move.nameEn}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <TypeBadge type={REVERSE_TYPE_IDS[move.typeId] || 'normal'} size="sm" className="scale-[0.8] origin-left" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {renderMoveActions && renderMoveActions(move, idx)}
                      <button 
                        onClick={() => onClearMove(idx)}
                        className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <MoveSearchSelect 
                    label="" 
                    moveList={moveList} 
                    onSelect={(m) => onSelectMove(idx, m)}
                    className="w-full"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Utility Section (Ability, Nature, Type) */}
      <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
            Ability & Nature
          </label>
          <div className="flex gap-2">
            <select 
              value={config.activeAbility || ''} 
              onChange={(e) => onAbilityChange(e.target.value)}
              className="flex-1 h-9 bg-gray-50 border border-gray-100 rounded-xl px-3 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {config.abilities.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select 
              value={config.nature} 
              onChange={(e) => onNatureChange(e.target.value)}
              className="flex-1 h-9 bg-gray-50 border border-gray-100 rounded-xl px-3 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {!hideTypeOverride && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Manual Type Override</label>
              <input 
                type="checkbox" 
                checked={config.isTypeOverridden} 
                onChange={onToggleTypeOverride}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            {config.isTypeOverridden && (
              <div className="flex gap-2">
                <select 
                  value={config.type1 || ''} 
                  onChange={(e) => onTypeChange(1, e.target.value)}
                  className="flex-1 h-9 bg-amber-50/50 border border-amber-100 rounded-xl px-3 text-xs font-bold text-amber-700 outline-none"
                >
                  {Object.keys(TYPE_IDS).map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
                <select 
                  value={config.type2 || 'none'} 
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
    </div>
  );
};

export default PokemonConfigForm;
