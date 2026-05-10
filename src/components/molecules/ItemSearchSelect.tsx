import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Generations } from '@smogon/calc';
import ItemImage from '@/components/atoms/ItemImage';

// Extract all valid items for Generation 9
const gen = Generations.get(9);
const allItems = Array.from(gen.items).map(item => item.name).sort();

interface ItemSearchSelectProps {
  label: string;
  selectedItem: string | null;
  onSelect: (item: string | null) => void;
  className?: string;
}

const ItemSearchSelect: React.FC<ItemSearchSelectProps> = ({ 
  label, 
  selectedItem,
  onSelect, 
  className = '' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    // Prioritize popular items if search is empty
    let results;
    if (!term) {
      results = ['Choice Band', 'Choice Specs', 'Choice Scarf', 'Life Orb', 'Assault Vest', 'Focus Sash', 'Leftovers', 'Sitrus Berry', 'Booster Energy'];
    } else {
      results = allItems
        .filter(name => name.toLowerCase().includes(term))
        .slice(0, 50);
    }
    setActiveIndex(results.length > 0 ? 0 : -1);
    return results;
  }, [searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        onSelect(filteredItems[activeIndex]);
        setSearchTerm('');
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  return (
    <div className={`relative ${className}`}>
      {(label || selectedItem) && (
        <div className="flex justify-between items-end mb-1 min-h-[16px]">
          {label ? (
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">
              {label}
            </label>
          ) : (
            <div /> // Spacer if no label
          )}
          {selectedItem && (
            <button 
              type="button"
              className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest px-0.5" 
              onClick={() => {
                onSelect(null);
                setSearchTerm('');
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={selectedItem || "Search Item..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-medium text-sm ${selectedItem ? 'text-blue-700' : 'text-gray-900'}`}
          />
          {isOpen && filteredItems.length > 0 && (
            <div 
              ref={scrollContainerRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              {filteredItems.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onSelect(name);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors border-b last:border-0 border-gray-100 ${index === activeIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-900'}`}
                >
                  <ItemImage name={name} className="w-6 h-6" />
                  <span className="text-sm font-semibold">{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ItemSearchSelect;
