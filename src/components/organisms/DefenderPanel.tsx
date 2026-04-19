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
  moveCategory: 'physical' | 'special';
}

const DefenderPanel: React.FC<DefenderPanelProps> = ({
  pokemonList, selectedId, onSelectPokemon,
  stats, onSpChange, nature, onNatureChange,
  effectiveness, moveCategory
}) => {
  const selectedPokemon = pokemonList.find(p => p.id === selectedId);

  const getEffectivenessColor = (val: number) => {
    if (val > 1) return 'bg-green-100 text-green-700 border-green-200';
    if (val < 1 && val > 0) return 'bg-red-100 text-red-700 border-red-200';
    if (val === 0) return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6">
      <div className="space-y-4">
        <Typography variant="h2" className="flex items-center gap-2">
          <span className="w-2 h-8 bg-red-600 rounded-full inline-block" />
          Pokémon 2
        </Typography>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden">
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
        <div className="flex justify-between items-end">
          <Typography variant="label" className="text-gray-400">Nature & Category</Typography>
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

      <div className="p-4 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
        <div className="flex justify-between items-center">
          <Typography variant="label">Type Effectiveness</Typography>
          <div className={`px-3 py-1 rounded font-black text-sm border ${getEffectivenessColor(effectiveness)}`}>
            {effectiveness}x
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefenderPanel;
