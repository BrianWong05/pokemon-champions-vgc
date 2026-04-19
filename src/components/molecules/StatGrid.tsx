import React from 'react';
import { calculateHP, calculateStat } from '@/utils/damage';

interface StatRowProps {
  label: string;
  base: number;
  sp: number;
  onSpChange: (val: number) => void;
  nature?: number;
  isHp?: boolean;
}

const StatRow: React.FC<StatRowProps> = ({ label, base, sp, onSpChange, nature = 1.0, isHp = false }) => {
  const total = isHp ? calculateHP(base, sp) : calculateStat(base, sp, nature);

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-1">
      <div className="col-span-2 text-xs font-bold text-gray-500 uppercase">{label}</div>
      <div className="col-span-2 text-center text-sm font-medium text-gray-500">
        {base}
      </div>
      <div className="col-span-6 flex items-center gap-2">
        <input 
          type="range" 
          min="0" 
          max="32" 
          value={sp} 
          onChange={(e) => onSpChange(parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <input 
          type="number" 
          min="0" 
          max="32" 
          value={sp} 
          onChange={(e) => onSpChange(Math.min(32, Math.max(0, parseInt(e.target.value, 10) || 0)))}
          className="w-10 bg-white border border-gray-200 text-center text-[10px] font-black text-blue-600 rounded p-0.5 outline-none focus:border-blue-400 transition-colors"
        />
      </div>
      <div className="col-span-2 text-right text-sm font-black text-gray-900">
        {total}
      </div>
    </div>
  );
};

interface StatGridProps {
  stats: {
    hp: { base: number; sp: number };
    atk: { base: number; sp: number; nature: number };
    def: { base: number; sp: number; nature: number };
    spa: { base: number; sp: number; nature: number };
    spd: { base: number; sp: number; nature: number };
    spe: { base: number; sp: number; nature: number };
  };
  onSpChange: (key: string, val: number) => void;
  className?: string;
}

const StatGrid: React.FC<StatGridProps> = ({ stats, onSpChange, className = '' }) => {
  const totalSp = Object.values(stats).reduce((sum, s) => sum + s.sp, 0);
  const isOverLimit = totalSp > 66;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-100">
        <div className="col-span-2 text-left">Stat</div>
        <div className="col-span-2 text-center">Base</div>
        <div className="col-span-6 text-center">Stat Points (SP)</div>
        <div className="col-span-2 text-right">Total</div>
      </div>
      
      <StatRow label="HP" base={stats.hp.base} sp={stats.hp.sp} onSpChange={(val) => onSpChange('spHp', val)} isHp />
      <StatRow label="Atk" base={stats.atk.base} sp={stats.atk.sp} nature={stats.atk.nature} onSpChange={(val) => onSpChange('spAtk', val)} />
      <StatRow label="Def" base={stats.def.base} sp={stats.def.sp} nature={stats.def.nature} onSpChange={(val) => onSpChange('spDef', val)} />
      <StatRow label="SpA" base={stats.spa.base} sp={stats.spa.sp} nature={stats.spa.nature} onSpChange={(val) => onSpChange('spSpa', val)} />
      <StatRow label="SpD" base={stats.spd.base} sp={stats.spd.sp} nature={stats.spd.nature} onSpChange={(val) => onSpChange('spSpd', val)} />
      <StatRow label="Spe" base={stats.spe.base} sp={stats.spe.sp} nature={stats.spe.nature} onSpChange={(val) => onSpChange('spSpe', val)} />

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
