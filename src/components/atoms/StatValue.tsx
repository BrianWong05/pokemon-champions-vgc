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
    red: 'text-red-600',
    orange: 'text-orange-600',
    gray: 'text-gray-700',
    blue: 'text-blue-600',
  };

  return (
    <span className={`${colorClasses[colorVariant]} ${isBold ? 'font-bold' : 'font-medium'} ${className}`}>
      {value}
    </span>
  );
};

export default StatValue;
