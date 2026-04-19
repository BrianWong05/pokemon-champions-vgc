import React from 'react';
import { calculateHP, calculateStat } from '@/utils/damage';

interface StatRowProps {
  statKey: string;
  label: string;
  base: number;
  sp: number;
  onSpChange: (val: number) => void;
  isHp?: boolean;
  boostedStat?: string | null;
  hinderedStat?: string | null;
  onToggleNature?: (stat: string, mod: '+' | '-') => void;
  stage?: number;
  onStageChange?: (stat: string, val: number) => void;
}

const StatRow: React.FC<StatRowProps> = ({ 
  statKey, label, base, sp, onSpChange, 
  isHp = false, boostedStat, hinderedStat, onToggleNature,
  stage = 0, onStageChange
}) => {
  const isBoosted = boostedStat === statKey;
  const isHindered = hinderedStat === statKey;
  const multiplier = isBoosted ? 1.1 : isHindered ? 0.9 : 1.0;
  
  const total = isHp ? calculateHP(base, sp) : calculateStat(base, sp, multiplier, stage);

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-1">
      {/* 1. Stat Label (2 cols) */}
      <div className="col-span-2 text-xs font-bold text-gray-500 uppercase">{label}</div>
      
      {/* 2. Base (1 col) */}
      <div className="col-span-1 text-center text-sm font-medium text-gray-500">
        {base}
      </div>

      {/* 3. SP Slider (3 cols) */}
      <div className="col-span-3 px-1">
        <input 
          type="range" 
          min="0" 
          max="32" 
          value={sp} 
          onChange={(e) => onSpChange(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* 4. SP Numeric (1 col) */}
      <div className="col-span-1">
        <input 
          type="number" 
          min="0" 
          max="32" 
          value={sp} 
          onChange={(e) => onSpChange(Math.min(32, Math.max(0, parseInt(e.target.value, 10) || 0)))}
          className="w-full bg-white border border-gray-200 text-center text-[10px] font-black text-blue-600 rounded p-0.5 outline-none focus:border-blue-400 transition-colors"
        />
      </div>

      {/* 5. Nature (2 cols) */}
      <div className="col-span-2 flex justify-center">
        {!isHp && onToggleNature ? (
          <div className="flex gap-1">
            <button
              onClick={() => onToggleNature(statKey, '+')}
              className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-black transition-colors ${isBoosted ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >
              +
            </button>
            <button
              onClick={() => onToggleNature(statKey, '-')}
              className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-black transition-colors ${isHindered ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >
              -
            </button>
          </div>
        ) : <div className="h-5" />}
      </div>

      {/* 6. Stage (1 col) */}
      <div className="col-span-1 flex justify-center">
        {!isHp && onStageChange ? (
          <div className="flex items-center bg-gray-100 rounded px-1 py-0.5">
            <button 
              onClick={() => onStageChange(statKey, stage - 1)}
              className="text-[10px] font-black text-gray-400 hover:text-blue-500 px-0.5"
            >
              «
            </button>
            <span className={`text-[9px] font-black min-w-[18px] text-center ${stage > 0 ? 'text-green-500' : stage < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {stage > 0 ? `+${stage}` : stage}
            </span>
            <button 
              onClick={() => onStageChange(statKey, stage + 1)}
              className="text-[10px] font-black text-gray-400 hover:text-green-500 px-0.5"
            >
              »
            </button>
          </div>
        ) : <div className="h-5" />}
      </div>

      {/* 7. Total (2 cols) */}
      <div className={`col-span-2 text-right text-sm font-black ${isBoosted ? 'text-red-600' : isHindered ? 'text-blue-600' : 'text-gray-900'}`}>
        {total}
      </div>
    </div>
  );
};

interface StatGridProps {
  stats: {
    hp: { base: number; sp: number };
    atk: { base: number; sp: number };
    def: { base: number; sp: number };
    spa: { base: number; sp: number };
    spd: { base: number; sp: number };
    spe: { base: number; sp: number };
  };
  boostedStat: string | null;
  hinderedStat: string | null;
  stages: Record<string, number>;
  onSpChange: (key: string, val: number) => void;
  onToggleNature: (stat: string, mod: '+' | '-') => void;
  onStageChange: (stat: string, val: number) => void;
  className?: string;
}

const StatGrid: React.FC<StatGridProps> = ({ 
  stats, boostedStat, hinderedStat, stages, onSpChange, onToggleNature, onStageChange, className = '' 
}) => {
  const totalSp = Object.values(stats).reduce((sum, s) => sum + s.sp, 0);
  const isOverLimit = totalSp > 66;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-100 mb-1">
        <div className="col-span-2 text-left">Stat</div>
        <div className="col-span-1 text-center">Base</div>
        <div className="col-span-4 text-center">SP</div>
        <div className="col-span-2 text-center">Nature</div>
        <div className="col-span-1 text-center">Stage</div>
        <div className="col-span-2 text-right">Total</div>
      </div>
      
      <div className="space-y-1">
        <StatRow statKey="hp" label="HP" base={stats.hp.base} sp={stats.hp.sp} onSpChange={(val) => onSpChange('spHp', val)} isHp />
        <StatRow statKey="atk" label="Atk" base={stats.atk.base} sp={stats.atk.sp} boostedStat={boostedStat} hinderedStat={hinderedStat} onToggleNature={onToggleNature} stage={stages.atk} onStageChange={onStageChange} onSpChange={(val) => onSpChange('spAtk', val)} />
        <StatRow statKey="def" label="Def" base={stats.def.base} sp={stats.def.sp} boostedStat={boostedStat} hinderedStat={hinderedStat} onToggleNature={onToggleNature} stage={stages.def} onStageChange={onStageChange} onSpChange={(val) => onSpChange('spDef', val)} />
        <StatRow statKey="spa" label="SpA" base={stats.spa.base} sp={stats.spa.sp} boostedStat={boostedStat} hinderedStat={hinderedStat} onToggleNature={onToggleNature} stage={stages.spa} onStageChange={onStageChange} onSpChange={(val) => onSpChange('spSpa', val)} />
        <StatRow statKey="spd" label="SpD" base={stats.spd.base} sp={stats.spd.sp} boostedStat={boostedStat} hinderedStat={hinderedStat} onToggleNature={onToggleNature} stage={stages.spd} onStageChange={onStageChange} onSpChange={(val) => onSpChange('spSpd', val)} />
        <StatRow statKey="spe" label="Spe" base={stats.spe.base} sp={stats.spe.sp} boostedStat={boostedStat} hinderedStat={hinderedStat} onToggleNature={onToggleNature} stage={stages.spe} onStageChange={onStageChange} onSpChange={(val) => onSpChange('spSpe', val)} />
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Total SP Used (Max 66)</span>
        <span className={`text-sm font-black ${isOverLimit ? 'text-red-600' : 'text-blue-600'}`}>
          {totalSp} / 66
        </span>
      </div>
    </div>
  );
};

export default StatGrid;
