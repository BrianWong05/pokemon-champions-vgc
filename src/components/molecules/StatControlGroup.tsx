import React from 'react';
import NumberInput from '@/components/atoms/NumberInput';
import Slider from '@/components/atoms/Slider';

interface StatControlGroupProps {
  label: string;
  baseValue: number;
  onBaseChange: (val: number) => void;
  spValue: number;
  onSpChange: (val: number) => void;
  natureValue?: number;
  onNatureChange?: (val: number) => void;
  className?: string;
}

const StatControlGroup: React.FC<StatControlGroupProps> = ({
  label,
  baseValue,
  onBaseChange,
  spValue,
  onSpChange,
  natureValue,
  onNatureChange,
  className = ''
}) => {
  return (
    <div className={`p-4 bg-gray-50 rounded-xl space-y-4 ${className}`}>
      <div className="flex gap-4 items-end">
        <NumberInput 
          label={`${label} Base`} 
          value={baseValue} 
          onChange={onBaseChange} 
          className="flex-1"
        />
        {onNatureChange && natureValue !== undefined && (
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nature</label>
            <select
              value={natureValue}
              onChange={(e) => onNatureChange(parseFloat(e.target.value))}
              className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={0.9}>- (0.9x)</option>
              <option value={1.0}>Neutral (1.0x)</option>
              <option value={1.1}>+ (1.1x)</option>
            </select>
          </div>
        )}
      </div>
      <Slider 
        label={`${label} SP`} 
        value={spValue} 
        onChange={onSpChange} 
      />
    </div>
  );
};

export default StatControlGroup;
