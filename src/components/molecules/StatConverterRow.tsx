import React from 'react';
import StatInput from '@/components/molecules/StatInput';
import StatSlider from '@/components/molecules/StatSlider';
import { convertEvToSp, convertSpToEv } from '@/features/pokemon/utils/sp-ev-converter';

interface StatConverterRowProps {
  label: string;
  evValue: number;
  onEvChange: (value: number) => void;
  className?: string;
}

const StatConverterRow: React.FC<StatConverterRowProps> = ({ 
  label, 
  evValue, 
  onEvChange,
  className = '' 
}) => {
  const spValue = convertEvToSp(evValue);

  const handleSpChange = (newSp: number) => {
    onEvChange(convertSpToEv(newSp));
  };

  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg hover:bg-raise transition-colors ${className}`}>
      <span className="text-ink-1 font-semibold min-w-[100px]">
        {label}
      </span>

      <div className="flex flex-1 items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-ink-3 font-bold uppercase tracking-wider">EVs:</span>
          <StatInput value={evValue} onChange={onEvChange} />
        </div>

        <StatSlider
          value={evValue}
          onChange={onEvChange}
          className="flex-1 min-w-[100px]"
        />

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-accent font-bold uppercase tracking-wider">SP:</span>
          <input
            type="number"
            value={spValue}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                handleSpChange(Math.max(0, Math.min(32, val)));
              }
            }}
            min={0}
            max={32}
            className="w-20 px-3 py-2 bg-accent-soft border border-accent-soft-line rounded-md focus:outline-none focus:ring-accent focus:border-accent text-accent font-bold text-center"
          />
        </div>
      </div>
    </div>
  );
};

export default StatConverterRow;
