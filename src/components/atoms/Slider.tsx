import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

const Slider: React.FC<SliderProps> = ({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 32,
  className = '' 
}) => {
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-ink-3 uppercase tracking-wider">{label}</label>
        <span className="text-sm font-bold text-accent">{value}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        min={min}
        max={max}
        className="h-2 bg-inset rounded-lg appearance-none cursor-pointer accent-accent"
      />
    </div>
  );
};

export default Slider;
