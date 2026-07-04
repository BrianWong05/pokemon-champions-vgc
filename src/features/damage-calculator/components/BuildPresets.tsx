import React from 'react';
import { COMMON_SPREADS, type Spread } from '../utils/common-spreads';

interface Props {
  onApplySpread: (spread: Spread) => void;
  onReset: () => void;
}

const BuildPresets: React.FC<Props> = ({ onApplySpread, onReset }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-gray-500 font-semibold">Build</span>
    {COMMON_SPREADS.map((s) => (
      <button
        key={s.id}
        onClick={() => onApplySpread(s)}
        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-medium"
      >
        {s.label}
      </button>
    ))}
    <button onClick={onReset} className="px-2 py-1 rounded text-red-600 hover:bg-red-50 font-medium">
      reset
    </button>
  </div>
);

export default BuildPresets;
