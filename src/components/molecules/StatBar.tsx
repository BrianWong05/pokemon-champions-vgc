import React from 'react';

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  colorClass?: string;
}

const StatBar: React.FC<StatBarProps> = ({ 
  label, 
  value, 
  max = 255, 
  colorClass = 'bg-accent'
}) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-ink-3 uppercase tracking-wide">{label}</span>
        <span className="text-ink-1">{value}</span>
      </div>
      <div className="h-2 w-full bg-inset rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default StatBar;
