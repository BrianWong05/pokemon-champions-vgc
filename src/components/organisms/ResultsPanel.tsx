import React from 'react';
import Typography from '@/components/atoms/Typography';
import { REVERSE_TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';
import TypeBadge from '@/components/molecules/TypeBadge';

export interface DamageResult {
  minDamage: number;
  maxDamage: number;
  minPercent: number;
  maxPercent: number;
  moveName: string;
  moveNameZh: string | null;
  moveType: number;
  originalType: number;
  isStab: boolean;
  effectiveness: number;
  triggeredAbilities?: string[];
  koChanceText?: string;
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
  
  // KO Logic: Use native koChanceText from Smogon
  const getKoStatus = (koText?: string) => {
    if (!koText || koText === '--') return { text: 'Survival', colorClass: 'bg-safe-soft border-safe-line text-safe' };

    const lower = koText.toLowerCase();
    if (lower.includes('guaranteed') && lower.includes('ohko')) {
      return { text: koText, colorClass: 'bg-danger-soft border-danger-line text-danger' };
    }
    if (lower.includes('possible') || lower.includes('ohko')) {
      return { text: koText, colorClass: 'bg-field-soft border-field-line text-field' };
    }
    return { text: koText, colorClass: 'bg-safe-soft border-safe-line text-safe' };
  };

  const impactKoStatus = getKoStatus(impactResult?.koChanceText);

  const safeCurrentHpPercent = isNaN(currentHpPercent) ? 100 : currentHpPercent;
  const safeMaxPercent = (impactResult && !isNaN(impactResult.maxPercent)) ? impactResult.maxPercent : 0;

  const hpRemainingPercent = Math.max(0, safeCurrentHpPercent - safeMaxPercent);

  const barColor = hpRemainingPercent > 50 ? 'bg-safe' : hpRemainingPercent > 20 ? 'bg-field' : 'bg-danger';

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <div className="flex items-center gap-2 px-1 text-ink-1">
        <div className={`w-1 h-4 ${themeColor} rounded-full`} />
        <Typography variant="label" className="text-ink-3 uppercase tracking-widest text-[10px] font-black">{label}</Typography>
      </div>

      <div className="flex-1 p-4 bg-inset rounded-3xl border border-line space-y-4 flex flex-col">
        {/* HP Bar and Status */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-ink-3">
              <span>Pokémon Health Status</span>
              <span className={barColor.replace('bg-', 'text-')}>{hpRemainingPercent.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-card rounded-full overflow-hidden border-2 border-line p-0.5 relative">
              {/* Background showing current health starting point */}
              <div
                className="absolute inset-0.5 bg-inset rounded-full"
                style={{ width: `${currentHpPercent}%` }}
              />
              {/* Foreground showing remaining health after impact */}
              <div
                className={`absolute inset-0.5 rounded-full transition-all duration-1000 ease-out ${barColor}`}
                style={{ width: `${hpRemainingPercent}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center bg-page/50 p-2 rounded-2xl border border-line">
            <div className="flex flex-col">
               <span className="text-xl font-display font-black text-ink-1 leading-none tracking-tighter">
                  {impactResult ? `${isNaN(impactResult.minPercent) ? '0.0' : impactResult.minPercent}% - ${isNaN(impactResult.maxPercent) ? '0.0' : impactResult.maxPercent}%` : '--'}
               </span>
               <span className="text-[10px] font-bold text-ink-3 mt-1 uppercase tracking-widest">
                  Incoming Impact Range
               </span>
            </div>
            <div className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${impactKoStatus.colorClass}`}>
              {impactKoStatus.text}
            </div>

          </div>
        </div>

        {/* Moves Vertical Stack */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="text-[10px] font-black text-ink-4 uppercase tracking-widest px-1 mb-1">Move Damage Assessment</div>
          {moveResults.map((result, idx) => {
            const isActive = moveActiveIndex === idx;
            if (!result) {
              return (
                <div
                  key={idx}
                  className="h-10 rounded-2xl border-2 border-dashed border-line bg-inset/5 flex items-center justify-center text-ink-4 text-[10px] font-black uppercase tracking-widest"
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
                  p-2 rounded-2xl border-2 transition-all text-left relative group
                  ${isActive
                    ? `border-accent bg-accent-soft`
                    : 'border-line bg-inset hover:border-line-3 hover:bg-raise'}
                `}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="font-black text-xs text-ink-3 uppercase tracking-widest leading-none mb-2 group-hover:text-accent transition-colors flex items-baseline gap-2">
                      <span className="truncate">{result.moveName}</span>
                      {result.moveNameZh && <span className="text-[10px] font-medium text-ink-3 truncate">{result.moveNameZh}</span>}
                      {result.moveType !== result.originalType && (
                        <span className="ml-auto text-accent text-[10px]">
                          ({REVERSE_TYPE_IDS[result.moveType]})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeBadge type={REVERSE_TYPE_IDS[result.moveType] || 'normal'} size="sm" className="scale-[0.9] origin-left -ml-1" />
                      {result.isStab && (
                        <span className="text-[9px] font-black text-accent bg-accent-soft px-2 py-0.5 rounded border border-accent-soft-line uppercase tracking-tighter">STAB</span>
                      )}
                      {result.triggeredAbilities?.map(ability => (
                        <span key={ability} className="text-[9px] font-black text-accent bg-accent-soft px-2 py-0.5 rounded border border-accent-soft-line uppercase tracking-tighter">
                          {ability} Active!
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end justify-center">
                    <span className="text-lg font-display font-black text-ink-1 whitespace-nowrap leading-none tracking-tighter">
                      {isNaN(result.minPercent) ? '0.0' : result.minPercent}% - {isNaN(result.maxPercent) ? '0.0' : result.maxPercent}%
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
    <div className="bg-card p-4 rounded-3xl text-ink-1 space-y-4 border border-line h-full">
      <div className="flex justify-between items-center border-b border-line pb-3">
        <Typography variant="h2" className="text-ink-1 flex items-center gap-3 font-black uppercase tracking-tighter">
          <span className="w-1.5 h-6 bg-accent rounded-full" />
          Battle Analysis Dashboard
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
           <div className="w-8 h-8 rounded-full bg-card border-4 border-line flex items-center justify-center text-[10px] font-black text-ink-3 uppercase tracking-tighter italic shadow-[var(--shadow-pop)]">
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
          themeColor="bg-accent"
        />

        <MoveResultColumn
          label="Pokémon 2 Status"
          moveResults={p2Results}
          moveActiveIndex={p2ActiveIndex}
          onSelectActive={onSelectP2Active}
          impactResult={p2Impact}
          currentHpPercent={p2HpPercent}
          sideMaxHp={p2MaxHp}
          themeColor="bg-danger"
        />
      </div>
    </div>
  );
};

export default ResultsPanel;
