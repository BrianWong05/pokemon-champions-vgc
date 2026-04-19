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
  selectedMoveId: number | null;
  onSelectMove: (m: MoveData) => void;
  movePower: number;
  onMovePowerChange: (val: number) => void;
  moveCategory: 'physical' | 'special';
  onMoveCategoryChange: (val: 'physical' | 'special') => void;
}

const AttackerPanel: React.FC<AttackerPanelProps> = ({
  pokemonList, selectedId, onSelectPokemon,
  stats, onSpChange, nature, onNatureChange,
  moveList, selectedMoveId, onSelectMove,
  movePower, onMovePowerChange, moveCategory, onMoveCategoryChange
}) => {
  const selectedPokemon = pokemonList.find(p => p.id === selectedId);
  const selectedMove = moveList.find(m => m.id === selectedMoveId);
  const types = Object.keys(TYPE_COLORS);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Typography variant="h2" className="flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-600 rounded-full inline-block" />
            Pokémon 1
          </Typography>
          <div className="flex gap-1">
            {selectedPokemon?.nameEn.includes('Mega') && (
              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-black uppercase">Mega</span>
            )}
          </div>
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
            <select 
              value={moveCategory} 
              onChange={(e) => onMoveCategoryChange(e.target.value as 'physical' | 'special')}
              className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-600 outline-none focus:border-blue-400 transition-colors"
            >
              <option value="physical">Physical</option>
              <option value="special">Special</option>
            </select>
          </div>
        </div>

        <StatGrid 
          stats={{
            hp: { base: stats.baseHp, sp: stats.spHp },
            atk: { base: stats.baseAtk, sp: stats.spAtk, nature: moveCategory === 'physical' ? nature : 1.0 },
            def: { base: stats.baseDef, sp: stats.spDef, nature: 1.0 },
            spa: { base: stats.baseSpa, sp: stats.spSpa, nature: moveCategory === 'special' ? nature : 1.0 },
            spd: { base: stats.baseSpd, sp: stats.spSpd, nature: 1.0 },
            spe: { base: stats.baseSpe, sp: stats.spSpe, nature: 1.0 },
          }}
          onSpChange={onSpChange}
        />
      </div>

      <div className="p-4 bg-blue-50 rounded-xl space-y-4">
        <div className="flex flex-col gap-4">
          <MoveSearchSelect 
            label="Select Move" 
            moveList={moveList} 
            onSelect={onSelectMove}
          />
          
          <div className="flex items-end gap-4 border-t border-blue-100 pt-3">
            <div className="flex-1">
              <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-1 block">Move Power</label>
              <input 
                type="number" 
                value={movePower} 
                onChange={(e) => onMovePowerChange(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded font-bold text-center text-sm text-blue-900 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            {selectedMove && (
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest block">Type</label>
                <div className="flex-1 flex items-center justify-center">
                   <TypeBadge type={REVERSE_TYPE_IDS[selectedMove.typeId] || 'normal'} size="sm" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackerPanel;
