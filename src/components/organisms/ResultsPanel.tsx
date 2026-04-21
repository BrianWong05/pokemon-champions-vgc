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
  originalType: number;
  isStab: boolean;
  effectiveness: number;
  triggeredAbilities?: string[];
}

interface MoveColProps {
  label: string;
  moveResults: (DamageResult | null)[];
  moveActiveIndex: number;
  onSelectActive: (index: number) => void;
  
  impactResult: DamageResult | null;
  currentHpPercent: number;
  sideMaxHp: number;
  
  themeColor: string;
  className?: string;
}

const MoveResultColumn: React.FC<MoveColProps> = ({ 
  label, moveResults, moveActiveIndex, onSelectActive, 
  impactResult, currentHpPercent, sideMaxHp,
  themeColor, className = '' 
}) => {
  const currentHpValue = Math.floor(sideMaxHp * (currentHpPercent / 100));
  
  // KO Logic: Compare damage against CURRENT HP, not Max HP
  const minDamage = impactResult ? impactResult.minDamage : 0;
  const maxDamage = impactResult ? impactResult.maxDamage : 0;

  const isGuaranteedKO = minDamage >= currentHpValue;
  const isPossibleKO = maxDamage >= currentHpValue && !isGuaranteedKO;

  const hpRemainingPercent = impactResult 
    ? Math.max(0, currentHpPercent - impactResult.maxPercent) 
    : currentHpPercent;

  const barColor = hpRemainingPercent > 50 ? 'bg-green-500' : hpRemainingPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      <div className="flex items-center gap-2 px-1 text-white">
        <div className={`w-1 h-4 ${themeColor} rounded-full`} />
        <Typography variant="label" className="text-gray-400 uppercase tracking-widest text-[10px] font-black">{label}</Typography>
      </div>

      <div className="flex-1 p-6 bg-gray-800/30 rounded-3xl border border-gray-800/50 space-y-6 flex flex-col">
        {/* HP Bar and Status */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
              <span>Pokémon Health Status</span>
              <span className={barColor.replace('bg-', 'text-')}>{hpRemainingPercent.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full bg-gray-900 rounded-full overflow-hidden border-2 border-gray-800 p-0.5 relative">
              {/* Background showing current health starting point */}
              <div 
                className="absolute inset-0.5 bg-gray-800/50 rounded-full"
                style={{ width: `${currentHpPercent}%` }}
              />
              {/* Foreground showing remaining health after impact */}
              <div 
                className={`absolute inset-0.5 rounded-full transition-all duration-1000 ease-out ${barColor}`}
                style={{ width: `${hpRemainingPercent}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-2xl border border-gray-800/50">
            <div className="flex flex-col">
               <span className="text-3xl font-black text-white leading-none tracking-tighter">
                  {impactResult ? `${impactResult.minPercent}% - ${impactResult.maxPercent}%` : '--'}
               </span>
               <span className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-widest">
                  Incoming Impact Range
               </span>
            </div>
            <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isGuaranteedKO ? 'bg-red-500/10 border-red-500/20 text-red-400' : isPossibleKO ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
              {isGuaranteedKO ? 'Guaranteed KO' : isPossibleKO ? 'Possible KO' : 'Survival'}
            </div>
          </div>
        </div>

        {/* Moves Vertical Stack */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1 mb-1">Move Damage Assessment</div>
          {moveResults.map((result, idx) => {
            const isActive = moveActiveIndex === idx;
            if (!result) {
              return (
                <div 
                  key={idx}
                  className="h-16 rounded-2xl border-2 border-dashed border-gray-800/50 bg-gray-800/5 flex items-center justify-center text-gray-700 text-[10px] font-black uppercase tracking-widest"
                >
                  Empty Slot {idx + 1}
                </div>
              );
            }

            return (
              <button
                key={idx}
                onClick={() => onSelectActive(idx)}
                className={`
                  p-4 rounded-2xl border-2 transition-all text-left relative group
                  ${isActive 
                    ? `border-blue-500 bg-blue-600/10 shadow-[0_0_25px_rgba(59,130,246,0.15)]` 
                    : 'border-gray-800/50 bg-gray-800/40 hover:border-gray-700 hover:bg-gray-800/60'}
                `}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="font-black text-xs text-gray-400 uppercase tracking-widest leading-none mb-2 group-hover:text-blue-400 transition-colors">
                      {result.moveName}
                      {result.moveType !== result.originalType && (
                        <span className="ml-2 text-blue-500 text-[10px]">
                          ({REVERSE_TYPE_IDS[result.moveType]})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeBadge type={REVERSE_TYPE_IDS[result.moveType] || 'normal'} size="sm" className="scale-[0.9] origin-left -ml-1" />
                      {result.isStab && (
                        <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter">STAB</span>
                      )}
                      {result.triggeredAbilities?.map(ability => (
                        <span key={ability} className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-tighter">
                          {ability} Active!
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end justify-center">
                    <span className="text-2xl font-black text-white whitespace-nowrap leading-none tracking-tighter">
                      {result.minPercent}% - {result.maxPercent}%
                    </span>
                  </div>
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

  p1HpPercent: number;
  p2HpPercent: number;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  p1Results, p1ActiveIndex, onSelectP1Active, p2MaxHp,
  p2Results, p2ActiveIndex, onSelectP2Active, p1MaxHp,
  p1HpPercent, p2HpPercent
}) => {
  const p1Impact = p2Results[p2ActiveIndex];
  const p2Impact = p1Results[p1ActiveIndex];

  return (
    <div className="bg-gray-900 p-6 rounded-3xl shadow-2xl text-white space-y-6 border border-gray-800 h-full">
      <div className="flex justify-between items-center border-b border-gray-800 pb-3">
        <Typography variant="h2" className="text-white flex items-center gap-3 font-black uppercase tracking-tighter">
          <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
          Battle Analysis Dashboard
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
           <div className="w-10 h-10 rounded-full bg-gray-900 border-4 border-gray-800 flex items-center justify-center text-xs font-black text-gray-500 uppercase tracking-tighter italic shadow-2xl">
              VS
           </div>
        </div>

        <MoveResultColumn 
          label="Pokémon 1 Status"
          moveResults={p1Results}
          moveActiveIndex={p1ActiveIndex}
          onSelectActive={onSelectP1Active}
          impactResult={p1Impact}
          currentHpPercent={p1HpPercent}
          sideMaxHp={p1MaxHp}
          themeColor="bg-blue-600"
        />

        <MoveResultColumn 
          label="Pokémon 2 Status"
          moveResults={p2Results}
          moveActiveIndex={p2ActiveIndex}
          onSelectActive={onSelectP2Active}
          impactResult={p2Impact}
          currentHpPercent={p2HpPercent}
          sideMaxHp={p2MaxHp}
          themeColor="bg-red-600"
        />
      </div>
    </div>
  );
};

export default ResultsPanel;
