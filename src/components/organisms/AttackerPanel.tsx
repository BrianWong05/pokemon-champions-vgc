import React from 'react';
import StatControlGroup from '@/components/molecules/StatControlGroup';
import Typography from '@/components/atoms/Typography';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import PokemonImage from '@/components/atoms/PokemonImage';

interface AttackerPanelProps {
  pokemonList: PokemonBaseStats[];
  selectedId: number | null;
  onSelectPokemon: (p: PokemonBaseStats) => void;
  baseAtk: number;
  onBaseAtkChange: (val: number) => void;
  spAtk: number;
  onSpAtkChange: (val: number) => void;
  natureAtk: number;
  onNatureAtkChange: (val: number) => void;
  movePower: number;
  onMovePowerChange: (val: number) => void;
  moveCategory: 'physical' | 'special';
  onMoveCategoryChange: (val: 'physical' | 'special') => void;
  isStab: boolean;
  onStabChange: (val: boolean) => void;
}

const AttackerPanel: React.FC<AttackerPanelProps> = ({
  pokemonList, selectedId, onSelectPokemon,
  baseAtk, onBaseAtkChange, spAtk, onSpAtkChange, natureAtk, onNatureAtkChange,
  movePower, onMovePowerChange, moveCategory, onMoveCategoryChange, isStab, onStabChange
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6">
      <Typography variant="h2" className="flex items-center gap-2">
        <span className="w-2 h-8 bg-blue-600 rounded-full inline-block" />
        Attacker
      </Typography>

      <div className="flex items-end gap-4 p-4 bg-gray-50 rounded-xl">
        {selectedId ? (
          <PokemonImage id={selectedId} name="Attacker" className="w-14 h-14" />
        ) : (
          <div className="w-14 h-14 bg-gray-200 rounded-lg animate-pulse" />
        )}
        <PokemonSearchSelect 
          label="Select Attacker" 
          pokemonList={pokemonList} 
          onSelect={onSelectPokemon}
          className="flex-1"
        />
      </div>

      <StatControlGroup 
        label={moveCategory === 'physical' ? 'Attack' : 'Sp. Atk'}
        baseValue={baseAtk}
        onBaseChange={onBaseAtkChange}
        spValue={spAtk}
        onSpChange={onSpAtkChange}
        natureValue={natureAtk}
        onNatureChange={onNatureAtkChange}
      />

      <div className="p-4 bg-blue-50 rounded-xl space-y-4">
        <Typography variant="label">Move Details</Typography>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Power</label>
            <input 
              type="number" 
              value={movePower} 
              onChange={(e) => onMovePowerChange(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
            <select 
              value={moveCategory} 
              onChange={(e) => onMoveCategoryChange(e.target.value as 'physical' | 'special')}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="physical">Physical</option>
              <option value="special">Special</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer group">
          <input 
            type="checkbox" 
            checked={isStab} 
            onChange={(e) => onStabChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">STAB (1.5x)</span>
        </label>
      </div>
    </div>
  );
};

export default AttackerPanel;
