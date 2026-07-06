import React from 'react';

interface StatValueProps {
  value: number;
  colorVariant?: 'red' | 'orange' | 'gray' | 'blue';
  isBold?: boolean;
  className?: string;
}

const StatValue: React.FC<StatValueProps> = ({ 
  value, 
  colorVariant = 'gray', 
  isBold = false, 
  className = '' 
}) => {
  const colorClasses = {
    red: 'text-danger',
    orange: 'text-field',
    gray: 'text-ink-2',
    blue: 'text-accent',
  };

  return (
    <span className={`font-display ${colorClasses[colorVariant]} ${isBold ? 'font-bold' : 'font-medium'} ${className}`}>
      {value}
    </span>
  );
};

export default StatValue;
