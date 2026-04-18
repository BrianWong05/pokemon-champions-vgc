import React from 'react';
import StatConverterRow from '@/components/molecules/StatConverterRow';
import ProgressBar from '@/components/atoms/ProgressBar';

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
  totalEvs: number;
  totalSp: number;
  className?: string;
}

const EvSpForm: React.FC<EvSpFormProps> = ({ 
  spread, 
  onSpreadChange, 
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
      </div>
    </div>
  );
};

export default EvSpForm;
