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
      className={`w-24 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium ${className}`}
    />
  );
};

export default StatInput;
