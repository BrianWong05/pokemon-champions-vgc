import React from 'react';

// Import all icons using Vite's glob import
const icons = import.meta.glob('@icons/*.svg', { 
  eager: true, 
  query: '?url',
  import: 'default' 
});

interface TypeIconProps {
  type: string;
  className?: string;
}

const TypeIcon: React.FC<TypeIconProps> = ({ type, className = 'w-4 h-4' }) => {
  const normalizedType = type.toLowerCase();
  const iconUrl = (icons[`/src/assets/icons/${normalizedType}.svg`] as string) || '';

  if (!iconUrl) {
    return null;
  }

  return (
    <img 
      src={iconUrl} 
      alt={`${type} icon`} 
      className={className} 
    />
  );
};

export default TypeIcon;
