import React from 'react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 999,
  className = '' 
}) => {
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <label className="text-xs font-bold text-ink-3 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        min={min}
        max={max}
        className="w-full px-3 py-2 bg-inset border border-line-2 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-ink-1 font-medium"
      />
    </div>
  );
};

export default NumberInput;
