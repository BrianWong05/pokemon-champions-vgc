import React from 'react';
import Typography from '@/components/atoms/Typography';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import ItemSearchSelect from '@/components/molecules/ItemSearchSelect';
import PokemonImage from '@/components/atoms/PokemonImage';
import TypeBadge from '@/components/atoms/TypeBadge';
import StatGrid from '@/components/molecules/StatGrid';
import MoveSearchSelect, { MoveData } from '@/components/molecules/MoveSearchSelect';
import { REVERSE_TYPE_IDS, TYPE_IDS } from '@/utils/pokemon-types';
import { calculateHP } from '@/utils/damage';

interface PokemonPanelProps {
  title: string;
  sideColor: string;
  side: 'p1' | 'p2';
  pokemonList: PokemonBaseStats[];
  selectedId: number | null;
  onSelectPokemon: (p: PokemonBaseStats) => void;
  stats: any;
  onSpChange: (key: string, val: number) => void;
  boostedStat: string | null;
  hinderedStat: string | null;
  onToggleNature: (stat: string, mod: '+' | '-') => void;
  stages: Record<string, number>;
  onStageChange: (stat: string, val: number) => void;
  moveList: MoveData[];
  moves: (MoveData | null)[];
  onSelectMove: (index: number, m: MoveData) => void;
  onClearMove: (index: number) => void;
  abilities: string[];
  activeAbility: string | null;
  onAbilityChange: (ability: string) => void;
  item: string | null;
  onItemChange: (item: string | null) => void;
  activeWeather: 'None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow';
  hpPercent: number;
  onHpPercentChange: (val: number) => void;
  type1: string | null;
  type2: string | null;
  onTypeChange: (slot: 1 | 2, type: string | null) => void;
  isTypeOverridden: boolean;
  onToggleTypeOverride: () => void;
  isReflect: boolean;
  isLightScreen: boolean;
  isAuroraVeil: boolean;
  isHelpingHand: boolean;
  isFriendGuard: boolean;
  isTailwind: boolean;
  onToggleSideEffect: (effect: 'isReflect' | 'isLightScreen' | 'isAuroraVeil' | 'isHelpingHand' | 'isFriendGuard' | 'isTailwind') => void;
  movesForceCrit: boolean[];
  onToggleMoveCrit: (index: number) => void;
}

const PokemonPanel: React.FC<PokemonPanelProps> = ({
  title, sideColor, side, pokemonList, selectedId, onSelectPokemon,
  stats, onSpChange, boostedStat, hinderedStat, onToggleNature,
  stages, onStageChange,
  moveList, moves, onSelectMove, onClearMove,
  abilities, activeAbility, onAbilityChange,
  item, onItemChange,
  activeWeather,
  hpPercent, onHpPercentChange,
  type1, type2, onTypeChange,
  isTypeOverridden, onToggleTypeOverride,
  isReflect, isLightScreen, isAuroraVeil, isHelpingHand, isFriendGuard, isTailwind,
  onToggleSideEffect,
  movesForceCrit, onToggleMoveCrit
}) => {
  const selectedPokemon = pokemonList.find(p => p.id === selectedId);
  const pokemonTypes = [type1, type2].filter((t): t is string => !!t).map(t => t.toLowerCase());

  const maxHp = calculateHP(stats.baseHp, stats.spHp);
  const currentHp = Math.floor(maxHp * (hpPercent / 100));

  const allTypes = Object.keys(TYPE_IDS);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 space-y-4 h-full">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Typography variant="h2" className="flex items-center gap-2">
            <span className={`w-2 h-8 ${sideColor} rounded-full inline-block`} />
            {title}
          </Typography>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden shrink-0">
            {selectedId ? (
              <PokemonImage id={selectedId} name={title} className="w-14 h-14" />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex gap-2">
              <div className="flex-1">
                <PokemonSearchSelect 
                  label={`Select ${title}`} 
                  pokemonList={pokemonList} 
                  onSelect={onSelectPokemon}
                />
              </div>
              <div className="flex-1">
                <ItemSearchSelect
                  label="Hold Item"
                  selectedItem={item}
                  onSelect={onItemChange}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-between">
              {selectedPokemon && (
                <div className="flex gap-2">
                  <TypeBadge 
                    type={(isTypeOverridden ? type1 : selectedPokemon.type1) || 'normal'} 
                    size="sm" 
                  /> 
                  {(isTypeOverridden ? type2 : selectedPokemon.type2) && (
                    <TypeBadge 
                      type={(isTypeOverridden ? type2 : selectedPokemon.type2) || 'normal'} 
                      size="sm" 
                    />
                  )}
                </div>
              )}
              {abilities.length > 0 && (
                <select 
                  value={activeAbility || ''} 
                  onChange={(e) => onAbilityChange(e.target.value)}
                  className="text-[10px] font-black uppercase tracking-widest bg-gray-50 border border-gray-100 rounded px-2 py-1 outline-none focus:border-blue-300"
                >
                  {abilities.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {selectedId && (
          <div className={`p-2 rounded-xl border transition-all space-y-1.5 ${isTypeOverridden ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isTypeOverridden} 
                  onChange={onToggleTypeOverride}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <Typography variant="label" className={`uppercase tracking-widest text-[8px] font-black transition-colors ${isTypeOverridden ? 'text-amber-700' : 'text-gray-400 group-hover:text-gray-600'}`}>
                  Manual Type Override
                </Typography>
              </label>
              {isTypeOverridden && (
                <Typography variant="body" className="text-[8px] font-bold text-amber-600/70 uppercase tracking-tighter italic animate-pulse">
                  Calculation Active
                </Typography>
              )}
            </div>
            <div className="flex gap-1.5 items-center">
              <select 
                value={type1 || ''} 
                onChange={(e) => onTypeChange(1, e.target.value)}
                disabled={!isTypeOverridden}
                className={`text-[9px] font-black uppercase tracking-widest border rounded px-1.5 py-1 outline-none transition-all ${isTypeOverridden ? 'bg-white border-amber-200 focus:border-amber-400' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
              >
                {allTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className={`text-[8px] font-bold ${isTypeOverridden ? 'text-amber-200' : 'text-gray-300'}`}>/</span>
              <select 
                value={type2 || 'none'} 
                onChange={(e) => onTypeChange(2, e.target.value === 'none' ? null : e.target.value)}
                disabled={!isTypeOverridden}
                className={`text-[9px] font-black uppercase tracking-widest border rounded px-1.5 py-1 outline-none transition-all ${isTypeOverridden ? 'bg-white border-amber-200 focus:border-amber-400' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
              >
                <option value="none">NONE</option>
                {allTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <StatGrid 
          stats={{
            hp: { base: stats.baseHp, sp: stats.spHp },
            atk: { base: stats.baseAtk, sp: stats.spAtk },
            def: { base: stats.baseDef, sp: stats.spDef },
            spa: { base: stats.baseSpa, sp: stats.spSpa },
            spd: { base: stats.baseSpd, sp: stats.spSpd },
            spe: { base: stats.baseSpe, sp: stats.spSpe },
          }}
          boostedStat={boostedStat}
          hinderedStat={hinderedStat}
          onToggleNature={onToggleNature}
          stages={stages}
          onStageChange={onStageChange}
          onSpChange={onSpChange}
          ability={activeAbility}
          weather={activeWeather}
          pokemonTypes={pokemonTypes}
          role={side === 'p1' ? 'attacker' : 'defender'}
        />
      </div>

      <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100 flex items-center gap-3">
        <div className="flex flex-col min-w-[70px]">
          <Typography variant="label" className="text-gray-400 uppercase tracking-widest text-[8px] font-black leading-tight mb-0.5">Current HP</Typography>
          <span className="text-[9px] font-black text-indigo-600">
            {currentHp} / {maxHp} HP
          </span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={Math.round(hpPercent)} 
          onChange={(e) => onHpPercentChange(parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex items-center gap-1">
          <input 
            type="number" 
            min="0" 
            max={maxHp} 
            value={currentHp} 
            onChange={(e) => {
              const targetHp = Math.min(maxHp, Math.max(0, parseInt(e.target.value, 10) || 0));
              onHpPercentChange((targetHp / maxHp) * 100);
            }}
            className="w-10 bg-white border border-gray-200 text-center text-[10px] font-black text-indigo-600 rounded py-0.5 px-0.5 outline-none focus:border-indigo-400 transition-colors"
          />
          <span className="text-[9px] font-black text-gray-400 mr-1">/ {maxHp}</span>
          
          <input 
            type="number" 
            min="0" 
            max="100" 
            value={Math.round(hpPercent)} 
            onChange={(e) => onHpPercentChange(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
            className="w-9 bg-white border border-gray-200 text-center text-[10px] font-black text-indigo-600 rounded py-0.5 px-0.5 outline-none focus:border-indigo-400 transition-colors"
          />
          <span className="text-[9px] font-black text-gray-400">%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Typography variant="label" className="text-gray-400 block mb-1 uppercase tracking-widest text-[10px] font-black">Move Pool Selection</Typography>
        <div className="grid grid-cols-1 gap-1.5">
          {moves.map((move, idx) => (
            <div 
              key={idx} 
              className={`
                p-2 rounded-xl border transition-all flex items-center gap-2
                ${move ? 'border-gray-200 bg-white shadow-sm' : 'border-gray-100 bg-gray-50/30'}
              `}
            >
              <div className="text-[10px] font-black text-gray-300 w-4">
                {idx + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                {move ? (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-baseline gap-2 overflow-hidden">
                        <span className="text-sm font-bold text-blue-900 leading-tight truncate">{move.nameEn}</span>
                        {move.nameZh && <span className="text-[10px] font-medium text-blue-900/60 truncate">{move.nameZh}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <TypeBadge type={REVERSE_TYPE_IDS[move.typeId] || 'normal'} size="sm" className="scale-[0.8] origin-left" />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter bg-gray-50 px-1 rounded border border-gray-100">
                          {move.damageClassId === 2 ? 'Phys' : 'Spec'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleMoveCrit(idx);
                        }}
                        className={`
                          px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all border
                          ${movesForceCrit[idx] 
                            ? 'bg-red-500 border-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]' 
                            : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400'}
                        `}
                        title="Force Critical Hit"
                      >
                        Crit
                      </button>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[9px] font-black text-gray-300 uppercase">Pwr</span>
                        <span className="text-sm font-black text-blue-900">{move.power || '--'}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearMove(idx);
                        }}
                        className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors group/clear"
                        title="Clear move"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
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

      <div className="space-y-2 pt-2 border-t border-gray-50">
        <Typography variant="label" className="text-gray-400 block mb-1 uppercase tracking-widest text-[10px] font-black">Support & Field Effects</Typography>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {[
            { id: 'isReflect', label: 'Reflect', value: isReflect },
            { id: 'isLightScreen', label: 'Light Screen', value: isLightScreen },
            { id: 'isAuroraVeil', label: 'Aurora Veil', value: isAuroraVeil },
            { id: 'isHelpingHand', label: 'Helping Hand', value: isHelpingHand },
            { id: 'isFriendGuard', label: 'Friend Guard', value: isFriendGuard },
            { id: 'isTailwind', label: 'Tailwind', value: isTailwind },
          ].map((effect) => (
            <label key={effect.id} className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={effect.value} 
                onChange={() => onToggleSideEffect(effect.id as any)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">
                {effect.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PokemonPanel;
