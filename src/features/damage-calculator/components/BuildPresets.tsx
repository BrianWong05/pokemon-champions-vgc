import React from 'react';
import { COMMON_SPREADS, type Spread } from '../utils/common-spreads';

interface Props {
  onApplySpread: (spread: Spread) => void;
  onReset: () => void;
}

const BuildPresets: React.FC<Props> = ({ onApplySpread, onReset }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-ink-3 font-semibold">Build</span>
    {COMMON_SPREADS.map((s) => (
      <button
        key={s.id}
        onClick={() => onApplySpread(s)}
        className="px-2 py-1 rounded bg-inset hover:bg-raise text-ink-2 font-medium"
      >
        {s.label}
      </button>
    ))}
    <button onClick={onReset} className="px-2 py-1 rounded text-danger hover:bg-danger-soft font-medium">
      reset
    </button>
  </div>
);

export default BuildPresets;
