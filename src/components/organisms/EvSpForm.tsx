import React from 'react';
import StatConverterRow from '@/components/molecules/StatConverterRow';
import ProgressBar from '@/components/molecules/ProgressBar';

export interface EvSpread {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface EvSpFormProps {
  spread: EvSpread;
  onSpreadChange: (spread: EvSpread) => void;
  onReset: () => void;
  totalEvs: number;
  totalSp: number;
  className?: string;
}

const EvSpForm: React.FC<EvSpFormProps> = ({ 
  spread, 
  onSpreadChange, 
  onReset,
  totalEvs, 
  totalSp,
  className = '' 
}) => {
  const stats: { key: keyof EvSpread; label: string }[] = [
    { key: 'hp', label: 'HP' },
    { key: 'atk', label: 'Attack' },
    { key: 'def', label: 'Defense' },
    { key: 'spa', label: 'Sp. Atk' },
    { key: 'spd', label: 'Sp. Def' },
    { key: 'spe', label: 'Speed' },
  ];

  const handleStatChange = (key: keyof EvSpread, value: number) => {
    onSpreadChange({ ...spread, [key]: value });
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="space-y-2 divide-y divide-gray-100">
        {stats.map(({ key, label }) => (
          <StatConverterRow
            key={key}
            label={label}
            evValue={spread[key]}
            onEvChange={(val) => handleStatChange(key, val)}
          />
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 space-y-6">
        <ProgressBar 
          label="Total EVs" 
          current={totalEvs} 
          max={510} 
        />
        <ProgressBar 
          label="Total SP Generated" 
          current={totalSp} 
          max={66} 
        />
        
        <div className="flex justify-center pt-4">
          <button
            onClick={onReset}
            className="px-8 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-100 hover:text-red-700 transition-all shadow-sm"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvSpForm;
