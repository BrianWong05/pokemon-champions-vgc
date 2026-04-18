import React from 'react';

interface PokemonImageProps {
  id: number;
  name: string;
  className?: string;
}

const PokemonImage: React.FC<PokemonImageProps> = ({ id, name, className = '' }) => {
  return (
    <img 
      src={`${import.meta.env.BASE_URL}images/pokemon/thumbnails/${id}.png`} 
      alt={name}
      className={`w-10 h-10 object-contain ${className}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
      }}
    />
  );
};

export default PokemonImage;
