import React, { useState, useMemo } from 'react';

export interface MoveData {
  id: number;
  identifier: string;
  nameEn: string;
  nameJa: string | null;
  nameZh: string | null;
  typeId: number;
  damageClassId: number; // 2: Physical, 3: Special
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number | null;
}

interface MoveSearchSelectProps {
  label: string;
  moveList: MoveData[];
  onSelect: (move: MoveData) => void;
  className?: string;
}

const MoveSearchSelect: React.FC<MoveSearchSelectProps> = ({ 
  label, 
  moveList, 
  onSelect, 
  className = '' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredMoves = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    const results = moveList
      .filter(m => 
        m.nameEn.toLowerCase().includes(term) || 
        (m.nameZh && m.nameZh.includes(term))
      )
      .slice(0, 15);
    setActiveIndex(results.length > 0 ? 0 : -1);
    return results;
  }, [searchTerm, moveList]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredMoves.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredMoves.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredMoves.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        onSelect(filteredMoves[activeIndex]);
        setSearchTerm(filteredMoves[activeIndex].nameEn);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-1 block">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="Search Move..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded font-bold text-sm text-blue-900 outline-none focus:border-blue-500 transition-colors"
        />
        {isOpen && filteredMoves.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredMoves.map((m, index) => (
              <button
                key={m.id}
                onClick={() => {
                  onSelect(m);
                  setSearchTerm(m.nameEn);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors border-b last:border-0 border-gray-100 ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex flex-col">
                  <span className={`text-sm font-bold ${index === activeIndex ? 'text-blue-700' : 'text-gray-900'}`}>{m.nameEn}</span>
                  {m.nameZh && <span className={`text-[10px] font-medium ${index === activeIndex ? 'text-blue-500' : 'text-gray-500'}`}>{m.nameZh}</span>}
                  <span className={`text-[10px] uppercase font-black ${index === activeIndex ? 'text-blue-400' : 'text-gray-400'}`}>{m.damageClassId === 2 ? 'Physical' : 'Special'}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className={`text-xs font-bold ${index === activeIndex ? 'text-blue-500' : 'text-gray-400'}`}>Pwr: {m.power || '--'}</span>
                </div>
              </button>
            ))}
          </div>
        )}
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

export default MoveSearchSelect;
