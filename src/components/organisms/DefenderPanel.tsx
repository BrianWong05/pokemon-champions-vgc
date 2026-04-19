import React from 'react';
import StatControlGroup from '@/components/molecules/StatControlGroup';
import Typography from '@/components/atoms/Typography';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import PokemonImage from '@/components/atoms/PokemonImage';

interface DefenderPanelProps {
  pokemonList: PokemonBaseStats[];
  selectedId: number | null;
  onSelectPokemon: (p: PokemonBaseStats) => void;
  baseHp: number;
  onBaseHpChange: (val: number) => void;
  spHp: number;
  onSpHpChange: (val: number) => void;
  baseDef: number;
  onBaseDefChange: (val: number) => void;
  spDef: number;
  onSpDefChange: (val: number) => void;
  natureDef: number;
  onNatureDefChange: (val: number) => void;
  effectiveness: number;
  onEffectivenessChange: (val: number) => void;
  moveCategory: 'physical' | 'special';
}

const DefenderPanel: React.FC<DefenderPanelProps> = ({
  pokemonList, selectedId, onSelectPokemon,
  baseHp, onBaseHpChange, spHp, onSpHpChange,
  baseDef, onBaseDefChange, spDef, onSpDefChange, natureDef, onNatureDefChange,
  effectiveness, onEffectivenessChange, moveCategory
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6">
      <Typography variant="h2" className="flex items-center gap-2">
        <span className="w-2 h-8 bg-red-600 rounded-full inline-block" />
        Defender
      </Typography>

      <div className="flex items-end gap-4 p-4 bg-gray-50 rounded-xl">
        {selectedId ? (
          <PokemonImage id={selectedId} name="Defender" className="w-14 h-14" />
        ) : (
          <div className="w-14 h-14 bg-gray-200 rounded-lg animate-pulse" />
        )}
        <PokemonSearchSelect 
          label="Select Defender" 
          pokemonList={pokemonList} 
          onSelect={onSelectPokemon}
          className="flex-1"
        />
      </div>

      <div className="space-y-4">
        <StatControlGroup 
          label="HP"
          baseValue={baseHp}
          onBaseChange={onBaseHpChange}
          spValue={spHp}
          onSpChange={onSpHpChange}
        />

        <StatControlGroup 
          label={moveCategory === 'physical' ? 'Defense' : 'Sp. Def'}
          baseValue={baseDef}
          onBaseChange={onBaseDefChange}
          spValue={spDef}
          onSpChange={onSpDefChange}
          natureValue={natureDef}
          onNatureChange={onNatureDefChange}
        />
      </div>

      <div className="p-4 bg-red-50 rounded-xl space-y-2">
        <Typography variant="label">Type Effectiveness</Typography>
        <select 
          value={effectiveness} 
          onChange={(e) => onEffectivenessChange(parseFloat(e.target.value))}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm focus:ring-red-500 focus:border-red-500"
        >
          <option value={0.25}>0.25x (Double Resist)</option>
          <option value={0.5}>0.5x (Resist)</option>
          <option value={1.0}>1.0x (Neutral)</option>
          <option value={2.0}>2.0x (Super Effective)</option>
          <option value={4.0}>4.0x (Double Weakness)</option>
        </select>
      </div>
    </div>
  );
};

export default DefenderPanel;
