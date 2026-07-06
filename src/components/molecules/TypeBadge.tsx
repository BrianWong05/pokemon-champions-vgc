import React from 'react';
import { TYPE_COLORS, getTypeName } from '@/features/pokemon/utils/pokemon-types';
import TypeIcon from '@/components/molecules/TypeIcon';

interface TypeBadgeProps {
  type: string;
  size?: 'sm' | 'md';
  className?: string;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type, size = 'sm', className = '' }) => {
  const color = TYPE_COLORS[type.toLowerCase()] || 'var(--type-normal)';
  const name = getTypeName(type);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] space-x-1',
    md: 'px-3 py-1 text-xs space-x-1.5',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full font-bold uppercase ${sizeClasses[size]} ${className}`}
      style={{
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 42%, transparent)`,
        color,
      }}
    >
      <TypeIcon type={type} className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>{name}</span>
    </div>
  );
};

export default TypeBadge;
