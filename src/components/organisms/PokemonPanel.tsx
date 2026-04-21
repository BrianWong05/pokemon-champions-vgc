import React from 'react';
import Typography from '@/components/atoms/Typography';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import PokemonImage from '@/components/atoms/PokemonImage';
import TypeBadge from '@/components/atoms/TypeBadge';
import StatGrid from '@/components/molecules/StatGrid';
import MoveSearchSelect, { MoveData } from '@/components/molecules/MoveSearchSelect';
import { REVERSE_TYPE_IDS } from '@/utils/pokemon-types';
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
  activeWeather: 'None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow';
  hpPercent: number;
  onHpPercentChange: (val: number) => void;
}

const PokemonPanel: React.FC<PokemonPanelProps> = ({
  title, sideColor, side, pokemonList, selectedId, onSelectPokemon,
  stats, onSpChange, boostedStat, hinderedStat, onToggleNature,
  stages, onStageChange,
  moveList, moves, onSelectMove, onClearMove,
  abilities, activeAbility, onAbilityChange, activeWeather,
  hpPercent, onHpPercentChange
}) => {
  const selectedPokemon = pokemonList.find(p => p.id === selectedId);
  const pokemonTypes = selectedPokemon ? [selectedPokemon.type1, selectedPokemon.type2].filter((t): t is string => !!t).map(t => t.toLowerCase()) : [];

  const maxHp = calculateHP(stats.baseHp, stats.spHp);
  const currentHp = Math.floor(maxHp * (hpPercent / 100));

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6 h-full">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Typography variant="h2" className="flex items-center gap-2">
            <span className={`w-2 h-8 ${sideColor} rounded-full inline-block`} />
            {title}
          </Typography>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden">
            {selectedId ? (
              <PokemonImage id={selectedId} name={title} className="w-14 h-14" />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <PokemonSearchSelect 
              label={`Select ${title}`} 
              pokemonList={pokemonList} 
              onSelect={onSelectPokemon}
            />
            <div className="flex items-center gap-2 justify-between">
              {selectedPokemon && (
                <div className="flex gap-2">
                  <TypeBadge type={selectedPokemon.type1} size="sm" /> 
                  {selectedPokemon.type2 && <TypeBadge type={selectedPokemon.type2} size="sm" />}
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
      </div>

      <div className="space-y-4">
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

      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
        <div className="flex justify-between items-center">
          <Typography variant="label" className="text-gray-400 uppercase tracking-widest text-[9px] font-black">Current HP %</Typography>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            {currentHp} / {maxHp} HP
          </span>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={hpPercent} 
            onChange={(e) => onHpPercentChange(parseInt(e.target.value, 10))}
            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <input 
            type="number" 
            min="1" 
            max="100" 
            value={hpPercent} 
            onChange={(e) => onHpPercentChange(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))}
            className="w-12 bg-white border border-gray-200 text-center text-[10px] font-black text-indigo-600 rounded p-1 outline-none focus:border-indigo-400 transition-colors"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Typography variant="label" className="text-gray-400 block mb-1 uppercase tracking-widest text-[10px] font-black">Move Pool Selection</Typography>
        <div className="grid grid-cols-1 gap-2">
          {moves.map((move, idx) => (
            <div 
              key={idx} 
              className={`
                p-3 rounded-xl border transition-all flex items-center gap-3
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
                      <span className="text-sm font-bold text-blue-900 leading-tight truncate">{move.nameEn}</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <TypeBadge type={REVERSE_TYPE_IDS[move.typeId] || 'normal'} size="sm" className="scale-[0.8] origin-left" />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter bg-gray-50 px-1 rounded border border-gray-100">
                          {move.damageClassId === 2 ? 'Phys' : 'Spec'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
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
    </div>
  );
};

export default PokemonPanel;
