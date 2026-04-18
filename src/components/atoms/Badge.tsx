import React from 'react';

interface BadgeProps {
  label: string;
  value: number;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ label, value, className = '' }) => {
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 ${className}`}>
      <span className="mr-1 opacity-75">{label}:</span>
      <span>{value}</span>
    </div>
  );
};

export default Badge;
