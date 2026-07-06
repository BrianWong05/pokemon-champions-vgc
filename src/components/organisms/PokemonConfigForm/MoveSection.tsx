import React from 'react';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import MoveSearchSelect from '@/components/molecules/MoveSearchSelect';
import TypeBadge from '@/components/molecules/TypeBadge';
import { REVERSE_TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';

interface MoveSectionProps {
  moves: (MoveData | null)[];
  moveList: MoveData[];
  onSelectMove: (index: number, m: MoveData) => void;
  onClearMove: (index: number) => void;
  renderMoveActions?: (move: MoveData | null, index: number) => React.ReactNode;
}

export const MoveSection: React.FC<MoveSectionProps> = ({
  moves,
  moveList,
  onSelectMove,
  onClearMove,
  renderMoveActions
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black text-ink-3 uppercase tracking-widest">
        MOVE POOL SELECTION
      </h3>
      <div className="space-y-2">
        {moves.map((move, idx) => (
          <div key={idx} className="flex items-center gap-4 bg-card border border-line rounded-2xl p-3">
            <span className="text-[10px] font-black text-ink-4 w-4 text-center">{idx + 1}</span>
            <div className="flex-1">
              {move ? (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-ink-1 leading-tight">{move.nameEn}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TypeBadge type={REVERSE_TYPE_IDS[move.typeId] || 'normal'} size="sm" className="scale-[0.8] origin-left" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {renderMoveActions && renderMoveActions(move, idx)}
                    <button
                      onClick={() => onClearMove(idx)}
                      className="p-1.5 hover:bg-danger-soft text-ink-4 hover:text-danger rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <MoveSearchSelect
                  label=""
                  moveList={moveList}
                  onSelect={(m) => onSelectMove(idx, m)}
                  className="w-full"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
