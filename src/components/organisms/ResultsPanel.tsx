import React from 'react';
import Typography from '@/components/atoms/Typography';

interface ResultsPanelProps {
  minDamage: number;
  maxDamage: number;
  minPercent: number;
  maxPercent: number;
  defenderMaxHp: number;
  isStab?: boolean;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  minDamage, maxDamage, minPercent, maxPercent, defenderMaxHp, isStab = false
}) => {
  const isKo = maxPercent >= 100;
  const hpRemaining = Math.max(0, 100 - maxPercent);
  
  const barColor = hpRemaining > 50 ? 'bg-green-500' : hpRemaining > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-gray-900 p-8 rounded-2xl shadow-xl text-white space-y-6">
      <div className="flex justify-between items-center">
        <Typography variant="h2" className="text-white">Damage Result</Typography>
        {isStab && (
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
            STAB
          </span>
        )}
      </div>
      
      <div className="text-center space-y-2">
        <div className="text-4xl font-black text-blue-400">
          {minPercent}% - {maxPercent}%
        </div>
        <div className="text-gray-400 font-medium text-sm">
          {minDamage} - {maxDamage} / {defenderMaxHp} HP
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
          <span>Defender HP After Max Roll</span>
          <span>{hpRemaining.toFixed(1)}%</span>
        </div>
        <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700 p-0.5">
          <div 
            className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
            style={{ width: `${hpRemaining}%` }}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-800">
        <div className={`text-center font-black text-xs uppercase tracking-widest px-4 py-2 rounded-lg ${isKo ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          {isKo ? 'Guaranteed 1HKO' : 'Survival Guaranteed'}
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;
