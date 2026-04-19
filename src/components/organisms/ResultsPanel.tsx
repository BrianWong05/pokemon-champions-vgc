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

interface MoveColProps {
  label: string;
  moveResults: (DamageResult | null)[];
  moveActiveIndex: number;
  onSelectActive: (index: number) => void;
  
  impactResult: DamageResult | null;
  hpRemaining: number;
  sideMaxHp: number;
  
  themeColor: string;
  className?: string;
}

const MoveResultColumn: React.FC<MoveColProps> = ({ 
  label, moveResults, moveActiveIndex, onSelectActive, 
  impactResult, hpRemaining, sideMaxHp,
  themeColor, className = '' 
}) => {
  const isKo = impactResult ? impactResult.maxPercent >= 100 : false;
  const barColor = hpRemaining > 50 ? 'bg-green-500' : hpRemaining > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      <div className="flex items-center gap-2 px-1">
        <div className={`w-1 h-4 ${themeColor} rounded-full`} />
        <Typography variant="label" className="text-gray-400 uppercase tracking-widest text-[10px] font-black">{label}</Typography>
      </div>

      <div className="flex-1 p-4 bg-gray-800/30 rounded-2xl border border-gray-800/50 space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter text-gray-500">
              <span>Health Status (Incoming Damage)</span>
              <span>{hpRemaining.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 w-full bg-gray-900 rounded-full overflow-hidden border-2 border-gray-800">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
                style={{ width: `${hpRemaining}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-baseline border-t border-gray-800/50 pt-3">
            <div className="flex flex-col">
               <span className="text-3xl font-black text-white leading-none">
                  {impactResult ? `${impactResult.maxPercent}%` : '--'}
               </span>
               <span className="text-[10px] font-bold text-gray-500 mt-1">
                  {impactResult ? `${impactResult.minPercent}% - ${impactResult.maxPercent}% received` : 'No incoming attack'}
               </span>
            </div>
            <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${isKo ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
              {isKo ? 'OHKO' : 'Survival'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-gray-800/50 pt-4 mt-auto">
          {moveResults.map((result, idx) => {
            const isActive = moveActiveIndex === idx;
            if (!result) {
              return (
                <div 
                  key={idx}
                  className="h-12 rounded-lg border border-dashed border-gray-800 bg-gray-800/5 flex items-center justify-center text-gray-700 text-[8px] font-black uppercase"
                >
                  Slot {idx + 1}
                </div>
              );
            }

            return (
              <button
                key={idx}
                onClick={() => onSelectActive(idx)}
                className={`
                  h-12 p-2 rounded-lg border transition-all text-left relative overflow-hidden flex flex-col justify-center
                  ${isActive 
                    ? `border-blue-500 bg-blue-600/20 shadow-lg` 
                    : 'border-gray-800 bg-gray-800/40 hover:border-gray-700 hover:bg-gray-800/60'}
                `}
              >
                <div className="font-black text-[9px] truncate text-white leading-tight">{result.moveName}</div>
                <div className="flex items-center justify-between mt-0.5">
                   <span className="text-[10px] font-black text-blue-400">{result.maxPercent}%</span>
                   <TypeBadge type={REVERSE_TYPE_IDS[result.moveType] || 'normal'} size="sm" className="scale-[0.7] origin-right -mr-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ResultsPanelProps {
  p1Results: (DamageResult | null)[];
  p1ActiveIndex: number;
  onSelectP1Active: (index: number) => void;
  p2MaxHp: number;
  
  p2Results: (DamageResult | null)[];
  p2ActiveIndex: number;
  onSelectP2Active: (index: number) => void;
  p1MaxHp: number;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  p1Results, p1ActiveIndex, onSelectP1Active, p2MaxHp,
  p2Results, p2ActiveIndex, onSelectP2Active, p1MaxHp
}) => {
  // P1 Side (Left): 
  // - Show P1's moves (to select what P1 will use)
  // - Show P1's Health Status (damage RECEIVED from P2)
  const p1Impact = p2Results[p2ActiveIndex];
  const p1HpRemaining = p1Impact ? Math.max(0, 100 - p1Impact.maxPercent) : 100;

  // P2 Side (Right): 
  // - Show P2's moves (to select what P2 will use)
  // - Show P2's Health Status (damage RECEIVED from P1)
  const p2Impact = p1Results[p1ActiveIndex];
  const p2HpRemaining = p2Impact ? Math.max(0, 100 - p2Impact.maxPercent) : 100;

  return (
    <div className="bg-gray-900 p-6 rounded-3xl shadow-2xl text-white space-y-6 border border-gray-800 h-full">
      <div className="flex justify-between items-center border-b border-gray-800 pb-3">
        <Typography variant="h2" className="text-white flex items-center gap-3">
          <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
          Battle Analysis
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
           <div className="w-8 h-8 rounded-full bg-gray-900 border-2 border-gray-800 flex items-center justify-center text-[10px] font-black text-gray-600 uppercase tracking-tighter italic">
              VS
           </div>
        </div>

        {/* Left Column: Focused on P1 status */}
        <MoveResultColumn 
          label="Pokémon 1 Status"
          moveResults={p1Results}
          moveActiveIndex={p1ActiveIndex}
          onSelectActive={onSelectP1Active}
          impactResult={p1Impact}
          hpRemaining={p1HpRemaining}
          sideMaxHp={p1MaxHp}
          themeColor="bg-blue-600"
        />

        {/* Right Column: Focused on P2 status */}
        <MoveResultColumn 
          label="Pokémon 2 Status"
          moveResults={p2Results}
          moveActiveIndex={p2ActiveIndex}
          onSelectActive={onSelectP2Active}
          impactResult={p2Impact}
          hpRemaining={p2HpRemaining}
          sideMaxHp={p2MaxHp}
          themeColor="bg-red-600"
        />
      </div>
    </div>
  );
};

export default ResultsPanel;
