import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  label: string;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, label, className = '' }) => {
  const percentage = Math.min(100, (current / max) * 100);
  const isOver = current > max;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between mb-1">
        <span className={`text-sm font-medium ${isOver ? 'text-danger' : 'text-ink-2'}`}>
          {label}: {current} / {max}
        </span>
        <span className="text-sm font-medium text-ink-3">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="w-full bg-inset rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${isOver ? 'bg-danger' : 'bg-accent'}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
