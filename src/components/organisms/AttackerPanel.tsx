import React from 'react';
import Typography from '@/components/atoms/Typography';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import PokemonImage from '@/components/atoms/PokemonImage';
import TypeBadge from '@/components/atoms/TypeBadge';
import StatGrid from '@/components/molecules/StatGrid';
import MoveSearchSelect, { MoveData } from '@/components/molecules/MoveSearchSelect';
import { TYPE_COLORS, REVERSE_TYPE_IDS } from '@/utils/pokemon-types';

interface AttackerPanelProps {
  pokemonList: PokemonBaseStats[];
  selectedId: number | null;
  onSelectPokemon: (p: PokemonBaseStats) => void;
  stats: any;
  onSpChange: (key: string, val: number) => void;
  nature: number;
  onNatureChange: (val: number) => void;
  moveList: MoveData[];
  moves: (MoveData | null)[];
  activeMoveIndex: number;
  onSelectMove: (index: number, m: MoveData) => void;
  onSetActiveMove: (index: number) => void;
  onMovePowerChange: (val: number) => void;
  onMoveCategoryChange: (val: 'physical' | 'special') => void;
}

const AttackerPanel: React.FC<AttackerPanelProps> = ({
  pokemonList, selectedId, onSelectPokemon,
  stats, onSpChange, nature, onNatureChange,
  moveList, moves, activeMoveIndex, onSelectMove, onSetActiveMove,
  onMovePowerChange, onMoveCategoryChange
}) => {
  const selectedPokemon = pokemonList.find(p => p.id === selectedId);
  const activeMove = moves[activeMoveIndex];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Typography variant="h2" className="flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-600 rounded-full inline-block" />
            Pokémon 1
          </Typography>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden">
            {selectedId ? (
              <PokemonImage id={selectedId} name="Attacker" className="w-14 h-14" />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <PokemonSearchSelect 
              label="Select Attacker" 
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
        <div className="flex justify-between items-end border-b border-gray-50 pb-2">
          <Typography variant="label" className="text-gray-400">Nature & Category</Typography>
          <div className="flex gap-2">
            <select 
              value={nature} 
              onChange={(e) => onNatureChange(parseFloat(e.target.value))}
              className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-600 outline-none focus:border-blue-400 transition-colors"
            >
              <option value={0.9}>- (0.9x)</option>
              <option value={1.0}>Neutral (1.0x)</option>
              <option value={1.1}>+ (1.1x)</option>
            </select>
          </div>
        </div>

        <StatGrid 
          stats={{
            hp: { base: stats.baseHp, sp: stats.spHp },
            atk: { base: stats.baseAtk, sp: stats.spAtk, nature: (activeMove?.damageClassId === 2) ? nature : 1.0 },
            def: { base: stats.baseDef, sp: stats.spDef, nature: 1.0 },
            spa: { base: stats.baseSpa, sp: stats.spSpa, nature: (activeMove?.damageClassId === 3) ? nature : 1.0 },
            spd: { base: stats.baseSpd, sp: stats.spSpd, nature: 1.0 },
            spe: { base: stats.baseSpe, sp: stats.spSpe, nature: 1.0 },
          }}
          onSpChange={onSpChange}
        />
      </div>

      <div className="space-y-3">
        <Typography variant="label" className="text-gray-400 block mb-1">Move Set (Max 4)</Typography>
        <div className="grid grid-cols-1 gap-2">
          {moves.map((move, idx) => (
            <div 
              key={idx} 
              onClick={() => onSetActiveMove(idx)}
              className={`
                p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3
                ${activeMoveIndex === idx ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-100 bg-gray-50/30 hover:border-gray-200'}
              `}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${activeMoveIndex === idx ? 'border-blue-500' : 'border-gray-300'}`}>
                {activeMoveIndex === idx && <div className="w-2 h-2 rounded-full bg-blue-500" />}
              </div>
              
              <div className="flex-1">
                {move ? (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-blue-900">{move.nameEn}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TypeBadge type={REVERSE_TYPE_IDS[move.typeId] || 'normal'} size="sm" />
                        <span className="text-[10px] font-black text-gray-400 uppercase">{move.damageClassId === 2 ? 'Phys' : 'Spec'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-black text-gray-400 uppercase block leading-none">Power</span>
                        <span className="text-sm font-black text-blue-900">{move.power || '--'}</span>
                      </div>
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
        <div className="p-4 bg-blue-900 rounded-xl space-y-3 shadow-inner">
           <div className="flex justify-between items-center">
              <Typography variant="label" className="text-blue-200">Active Move Tuning</Typography>
              <select 
                value={activeMove.damageClassId === 2 ? 'physical' : 'special'} 
                onChange={(e) => onMoveCategoryChange(e.target.value as 'physical' | 'special')}
                className="px-2 py-0.5 bg-blue-800 border border-blue-700 rounded text-[10px] font-black text-blue-100 uppercase outline-none"
              >
                <option value="physical">Physical</option>
                <option value="special">Special</option>
              </select>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1 block">Override Power</label>
                <input 
                  type="number" 
                  value={activeMove.power || 0} 
                  onChange={(e) => onMovePowerChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1.5 bg-blue-800 border border-blue-700 rounded font-black text-center text-sm text-white outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest block text-center">Type</label>
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

export default AttackerPanel;
