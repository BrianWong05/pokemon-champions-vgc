import React from 'react';
import StatInput from '@/components/atoms/StatInput';
import Badge from '@/components/atoms/Badge';
import { calculateSP } from '@/utils/ev-conversion';

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
  const spValue = calculateSP(evValue);

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors ${className}`}>
      <span className="text-gray-900 font-semibold min-w-[100px]">
        {label}
      </span>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">EVs:</span>
          <StatInput value={evValue} onChange={onEvChange} />
        </div>
        
        <Badge label="SP" value={spValue} className="min-w-[70px] justify-center" />
      </div>
    </div>
  );
};

export default StatConverterRow;
