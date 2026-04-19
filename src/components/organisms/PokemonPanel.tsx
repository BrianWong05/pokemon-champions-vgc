import React from 'react';
import Typography from '@/components/atoms/Typography';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import PokemonImage from '@/components/atoms/PokemonImage';
import TypeBadge from '@/components/atoms/TypeBadge';
import StatGrid from '@/components/molecules/StatGrid';
import MoveSearchSelect, { MoveData } from '@/components/molecules/MoveSearchSelect';
import { REVERSE_TYPE_IDS } from '@/utils/pokemon-types';

interface PokemonPanelProps {
  title: string;
  sideColor: string;
  pokemonList: PokemonBaseStats[];
  selectedId: number | null;
  onSelectPokemon: (p: PokemonBaseStats) => void;
  stats: any;
  onSpChange: (key: string, val: number) => void;
  boostedStat: string | null;
  hinderedStat: string | null;
  onToggleNature: (stat: string, mod: '+' | '-') => void;
  moveList: MoveData[];
  moves: (MoveData | null)[];
  activeMoveIndex: number;
  onSelectMove: (index: number, m: MoveData) => void;
  onMovePowerChange: (val: number) => void;
  onMoveCategoryChange: (val: 'physical' | 'special') => void;
}

const PokemonPanel: React.FC<PokemonPanelProps> = ({
  title, sideColor, pokemonList, selectedId, onSelectPokemon,
  stats, onSpChange, boostedStat, hinderedStat, onToggleNature,
  moveList, moves, activeMoveIndex, onSelectMove,
  onMovePowerChange, onMoveCategoryChange
}) => {
  const selectedPokemon = pokemonList.find(p => p.id === selectedId);
  const activeMove = moves[activeMoveIndex];

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
            {selectedPokemon && (
              <div className="flex gap-2">
                <TypeBadge type={selectedPokemon.type1} size="sm" /> 
                {selectedPokemon.type2 && <TypeBadge type={selectedPokemon.type2} size="sm" />}
              </div>
            )}
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
          onSpChange={onSpChange}
        />
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
                    <div className="flex items-baseline gap-1 pl-2">
                      <span className="text-[9px] font-black text-gray-300 uppercase">Pwr</span>
                      <span className="text-sm font-black text-blue-900">{move.power || '--'}</span>
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

      {activeMove && (
        <div className="p-4 bg-gray-900 rounded-2xl space-y-3 shadow-xl border border-gray-800">
           <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <Typography variant="label" className="text-gray-400">Slot {activeMoveIndex + 1} Active Tuning</Typography>
              </div>
              <select 
                value={activeMove.damageClassId === 2 ? 'physical' : 'special'} 
                onChange={(e) => onMoveCategoryChange(e.target.value as 'physical' | 'special')}
                className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-[9px] font-black text-blue-400 uppercase outline-none focus:border-blue-500"
              >
                <option value="physical">Physical</option>
                <option value="special">Special</option>
              </select>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Override Power</label>
                <input 
                  type="number" 
                  value={activeMove.power || 0} 
                  onChange={(e) => onMovePowerChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded font-black text-center text-sm text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block text-center">Type</label>
                <div className="flex-1 flex items-center justify-center mt-1">
                   <TypeBadge type={REVERSE_TYPE_IDS[activeMove.typeId] || 'normal'} size="sm" />
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PokemonPanel;
