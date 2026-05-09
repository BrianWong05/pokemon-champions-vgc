import React from 'react';
import { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import { calculateHP, calculateStat } from '@/features/damage-calculator/utils/damage-calc';
import PokemonImage from '@/components/atoms/PokemonImage';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface TeamMemberStatDisplayProps {
  config: PokemonConfig;
  pokemonList: PokemonBaseStats[];
}

const StatRow = ({ label, base, sp, total, isBoosted, isHindered }: { label: string, base: number, sp: number, total: number, isBoosted?: boolean, isHindered?: boolean }) => (
  <div className="grid grid-cols-4 gap-2 items-center py-1 border-b border-gray-50 last:border-0 text-[10px]">
    <div className="col-span-1 font-black text-gray-400 uppercase tracking-tighter">{label}</div>
    <div className="col-span-1 text-center font-bold text-gray-500">{base}</div>
    <div className="col-span-1 text-center font-bold text-blue-600">{sp}</div>
    <div className={`col-span-1 text-right font-black ${isBoosted ? 'text-red-600' : isHindered ? 'text-blue-600' : 'text-gray-800'}`}>{total}</div>
  </div>
);

const TeamMemberStatDisplay: React.FC<TeamMemberStatDisplayProps> = ({ config, pokemonList }) => {
  const hpTotal = calculateHP(config.baseHp, config.spHp);
  const atkTotal = calculateStat(config.baseAtk, config.spAtk, config.boostedStat === 'atk' ? 1.1 : config.hinderedStat === 'atk' ? 0.9 : 1.0, 0, 1.0);
  const defTotal = calculateStat(config.baseDef, config.spDef, config.boostedStat === 'def' ? 1.1 : config.hinderedStat === 'def' ? 0.9 : 1.0, 0, 1.0);
  const spaTotal = calculateStat(config.baseSpa, config.spSpa, config.boostedStat === 'spa' ? 1.1 : config.hinderedStat === 'spa' ? 0.9 : 1.0, 0, 1.0);
  const spdTotal = calculateStat(config.baseSpd, config.spSpd, config.boostedStat === 'spd' ? 1.1 : config.hinderedStat === 'spd' ? 0.9 : 1.0, 0, 1.0);
  const speTotal = calculateStat(config.baseSpe, config.spSpe, config.boostedStat === 'spe' ? 1.1 : config.hinderedStat === 'spe' ? 0.9 : 1.0, 0, 1.0);

  const totalSp = config.spHp + config.spAtk + config.spDef + config.spSpa + config.spSpd + config.spSpe;
  const isOverLimit = totalSp > 66;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-2">
      <div className="grid grid-cols-4 gap-2 text-[8px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-100 mb-1">
        <div className="col-span-1 text-left">Stat</div>
        <div className="col-span-1 text-center">Base</div>
        <div className="col-span-1 text-center">SP</div>
        <div className="col-span-1 text-right">Total</div>
      </div>
      <div className="space-y-0.5">
        <StatRow label="HP" base={config.baseHp} sp={config.spHp} total={hpTotal} />
        <StatRow label="Atk" base={config.baseAtk} sp={config.spAtk} total={atkTotal} isBoosted={config.boostedStat === 'atk'} isHindered={config.hinderedStat === 'atk'} />
        <StatRow label="Def" base={config.baseDef} sp={config.spDef} total={defTotal} isBoosted={config.boostedStat === 'def'} isHindered={config.hinderedStat === 'def'} />
        <StatRow label="SpA" base={config.baseSpa} sp={config.spSpa} total={spaTotal} isBoosted={config.boostedStat === 'spa'} isHindered={config.hinderedStat === 'spa'} />
        <StatRow label="SpD" base={config.baseSpd} sp={config.spSpd} total={spdTotal} isBoosted={config.boostedStat === 'spd'} isHindered={config.hinderedStat === 'spd'} />
        <StatRow label="Spe" base={config.baseSpe} sp={config.spSpe} total={speTotal} isBoosted={config.boostedStat === 'spe'} isHindered={config.hinderedStat === 'spe'} />
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Total SP</span>
        <span className={`text-[10px] font-black ${isOverLimit ? 'text-red-600' : 'text-blue-600'}`}>
          {totalSp} / 66
        </span>
      </div>
    </div>
  );
};

export default TeamMemberStatDisplay;
