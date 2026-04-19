import React from 'react';
import Typography from '@/components/atoms/Typography';
import { REVERSE_TYPE_IDS } from '@/utils/pokemon-types';
import TypeBadge from '@/components/atoms/TypeBadge';

export interface DamageResult {
  minDamage: number;
  maxDamage: number;
  minPercent: number;
  maxPercent: number;
  moveName: string;
  moveType: number;
  isStab: boolean;
  effectiveness: number;
}

interface ResultsPanelProps {
  results: (DamageResult | null)[];
  activeIndex: number;
  onSelectActive: (index: number) => void;
  defenderMaxHp: number;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results, activeIndex, onSelectActive, defenderMaxHp
}) => {
  const activeResult = results[activeIndex];
  const hpRemaining = activeResult ? Math.max(0, 100 - activeResult.maxPercent) : 100;
  const isKo = activeResult ? activeResult.maxPercent >= 100 : false;
  
  const barColor = hpRemaining > 50 ? 'bg-green-500' : hpRemaining > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-gray-900 p-6 md:p-8 rounded-3xl shadow-2xl text-white space-y-8 border border-gray-800">
      {/* Move Result Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {results.map((result, idx) => {
          if (!result) {
            return (
              <div 
                key={idx}
                className="p-4 rounded-2xl border-2 border-dashed border-gray-800 bg-gray-800/20 flex items-center justify-center text-gray-600 text-[10px] font-black uppercase tracking-widest"
              >
                Slot {idx + 1} Empty
              </div>
            );
          }

          const isActive = activeIndex === idx;

          return (
            <button
              key={idx}
              onClick={() => onSelectActive(idx)}
              className={`
                p-4 rounded-2xl border-2 transition-all text-left relative group overflow-hidden
                ${isActive 
                  ? 'border-blue-500 bg-blue-600/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                  : 'border-gray-800 bg-gray-800/40 hover:border-gray-700 hover:bg-gray-800/60'}
              `}
            >
              {result.isStab && (
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-500 text-[8px] font-black uppercase tracking-tighter rounded-bl-lg">
                  STAB
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 group-hover:text-gray-400 transition-colors">
                    Move {idx + 1}
                  </div>
                  <div className="font-black text-sm truncate pr-6">{result.moveName}</div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-xl font-black text-blue-400">
                    {result.maxPercent}%
                  </div>
                  <TypeBadge type={REVERSE_TYPE_IDS[result.moveType] || 'normal'} size="sm" />
                </div>

                <div className="text-[10px] font-bold text-gray-500">
                  {result.minDamage}-{result.maxDamage} HP
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main HP Bar Section */}
      <div className="pt-8 border-t border-gray-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Typography variant="h2" className="text-white flex items-center gap-3">
              <span className="w-1.5 h-6 bg-red-500 rounded-full" />
              Impact Summary
            </Typography>
            <p className="text-gray-500 text-xs font-medium">
              Results based on {activeResult ? activeResult.moveName : 'selected move'} (Max Roll)
            </p>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tighter">
              {activeResult ? `${activeResult.minPercent}% - ${activeResult.maxPercent}%` : '--'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
            <span className="text-gray-400 italic">Remaining Defender Health</span>
            <span className={barColor.replace('bg-', 'text-')}>
              {hpRemaining.toFixed(1)}% / {defenderMaxHp} HP
            </span>
          </div>
          <div className="h-6 w-full bg-gray-800 rounded-2xl overflow-hidden border-4 border-gray-800 shadow-inner relative">
            <div 
              className={`h-full rounded-xl transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)] ${barColor}`}
              style={{ width: `${hpRemaining}%` }}
            />
            {/* Visual markers for HP bar */}
            <div className="absolute inset-0 flex justify-evenly pointer-events-none opacity-10">
              <div className="w-px h-full bg-white" />
              <div className="w-px h-full bg-white" />
              <div className="w-px h-full bg-white" />
            </div>
          </div>
        </div>

        <div className={`
          p-4 rounded-2xl border flex items-center justify-center gap-3 transition-colors
          ${isKo 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-green-500/10 border-green-500/20 text-green-400'}
        `}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${isKo ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="font-black text-xs uppercase tracking-widest">
            {isKo ? 'Guaranteed 1HKO' : 'Survival Guaranteed'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;
