import React, { useState, useEffect } from 'react';
import { getItemImageUrl } from '@/features/pokemon/utils/items';

interface ItemImageProps {
  name: string | null;
  className?: string;
  title?: string;
}

const ItemImage: React.FC<ItemImageProps> = ({ name, className = '', title }) => {
  const [error, setError] = useState(false);
  const imageUrl = getItemImageUrl(name);

  // Reset error state when name changes
  useEffect(() => {
    setError(false);
  }, [name]);

  if (!imageUrl || error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200 ${className}`}
        title={title}
      >
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">?</span>
      </div>
    );
  }

  return (
    <img 
      loading="lazy"
      decoding="async"
      src={`${import.meta.env.BASE_URL}${imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl}`} 
      alt={name || 'Item'}
      title={title}
      className={`object-contain ${className}`}
      onError={() => setError(true)}
    />
  );
};

export default ItemImage;
