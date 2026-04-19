import React from 'react';
import Typography from '@/components/atoms/Typography';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import PokemonImage from '@/components/atoms/PokemonImage';
import TypeBadge from '@/components/atoms/TypeBadge';
import StatGrid from '@/components/molecules/StatGrid';

interface DefenderPanelProps {
  pokemonList: PokemonBaseStats[];
  selectedId: number | null;
  onSelectPokemon: (p: PokemonBaseStats) => void;
  stats: any;
  onSpChange: (key: string, val: number) => void;
  nature: number;
  onNatureChange: (val: number) => void;
  effectiveness: number;
  onEffectivenessChange: (val: number) => void;
  moveCategory: 'physical' | 'special';
}

const DefenderPanel: React.FC<DefenderPanelProps> = ({
  pokemonList, selectedId, onSelectPokemon,
  stats, onSpChange, nature, onNatureChange,
  effectiveness, onEffectivenessChange, moveCategory
}) => {
  const selectedPokemon = pokemonList.find(p => p.id === selectedId);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6">
      <div className="space-y-4">
        <Typography variant="h2" className="flex items-center gap-2">
          <span className="w-2 h-8 bg-red-600 rounded-full inline-block" />
          Pokémon 2
        </Typography>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
            {selectedId ? (
              <PokemonImage id={selectedId} name="Defender" className="w-14 h-14" />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <PokemonSearchSelect 
              label="Select Defender" 
              pokemonList={pokemonList} 
              onSelect={onSelectPokemon}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <Typography variant="label" className="text-gray-400">Nature & Category</Typography>
          <select 
            value={nature} 
            onChange={(e) => onNatureChange(parseFloat(e.target.value))}
            className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-600"
          >
            <option value={0.9}>- (0.9x)</option>
            <option value={1.0}>Neutral (1.0x)</option>
            <option value={1.1}>+ (1.1x)</option>
          </select>
        </div>

        <StatGrid 
          stats={{
            hp: { base: stats.baseHp, sp: stats.spHp },
            atk: { base: stats.baseAtk, sp: stats.spAtk, nature: 1.0 },
            def: { base: stats.baseDef, sp: stats.spDef, nature: moveCategory === 'physical' ? nature : 1.0 },
            spa: { base: stats.baseSpa, sp: stats.spSpa, nature: 1.0 },
            spd: { base: stats.baseSpd, sp: stats.spSpd, nature: moveCategory === 'special' ? nature : 1.0 },
            spe: { base: stats.baseSpe, sp: stats.spSpe, nature: 1.0 },
          }}
          onSpChange={onSpChange}
        />
      </div>

      <div className="p-4 bg-red-50 rounded-xl space-y-2">
        <div className="flex justify-between items-center">
          <Typography variant="label">Effectiveness</Typography>
          <select 
            value={effectiveness} 
            onChange={(e) => onEffectivenessChange(parseFloat(e.target.value))}
            className="px-2 py-1 bg-white border border-gray-300 rounded font-bold text-xs"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1.0}>1.0x</option>
            <option value={2.0}>2.0x</option>
            <option value={4.0}>4.0x</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default DefenderPanel;
