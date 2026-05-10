import React from 'react';

interface PokemonImageProps {
  id: number;
  name: string;
  className?: string;
}

const PokemonImage: React.FC<PokemonImageProps> = ({ id, name, className = '' }) => {
  return (
    <img 
      loading="lazy"
      decoding="async"
      src={`${import.meta.env.BASE_URL}images/pokemon/thumbnails/${id}.png`} 
      alt={name}
      className={`object-contain ${className || 'w-16 h-16'}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
      }}
    />
  );
};

export default PokemonImage;
