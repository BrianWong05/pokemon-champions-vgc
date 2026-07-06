import React from 'react';

interface StatInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

const StatInput: React.FC<StatInputProps> = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 252,
  className = '' 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) || 0;
    onChange(Math.max(min, Math.min(max, val)));
  };

  return (
    <input
      type="number"
      value={value}
      onChange={handleChange}
      min={min}
      max={max}
      step={4}
      className={`w-24 px-3 py-2 bg-inset border border-line-2 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-ink-1 font-medium ${className}`}
    />
  );
};

export default StatInput;
