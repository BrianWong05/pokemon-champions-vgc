import React, { useState } from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import { Chip, Sheet } from '@/design-system/arena';

const WEATHER = ['None', 'Sun', 'Rain', 'Sandstorm', 'Snow'] as const;
const TERRAIN = ['None', 'Electric', 'Grassy', 'Misty', 'Psychic'] as const;

function toggleButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 11px',
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'var(--font-ui)',
    fontSize: 10.5,
    fontWeight: 700,
    lineHeight: 1.7,
    whiteSpace: 'nowrap',
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--ink-3)',
  };
}

/** ArenaBattlefieldRow — compact field-condition row for the landscape calculator center column. */
export function ArenaBattlefieldRow({ state, dispatch }: { state: CalcState; dispatch: React.Dispatch<CalcAction> }) {
  const [picker, setPicker] = useState<'weather' | 'terrain' | null>(null);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          BATTLEFIELD
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', border: '1px solid var(--line-1)', borderRadius: 'var(--r-pill)', overflow: 'hidden', background: 'var(--surface-inset)' }}>
          <button
            type="button"
            style={toggleButtonStyle(!state.isSpreadTarget)}
            onClick={() => dispatch({ type: 'SET_SPREAD_TARGET', payload: false })}
          >
            Single
          </button>
          <button
            type="button"
            style={toggleButtonStyle(state.isSpreadTarget)}
            onClick={() => dispatch({ type: 'SET_SPREAD_TARGET', payload: true })}
          >
            Spread
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Chip tone="field" active={state.weather !== 'None'} onClick={() => setPicker('weather')}>
          {state.weather === 'None' ? '☀ Weather' : state.weather}
        </Chip>
        <Chip tone="accent" active={state.terrain !== 'None'} onClick={() => setPicker('terrain')}>
          {state.terrain === 'None' ? 'Terrain' : state.terrain}
        </Chip>
        <Chip tone="accent" active={state.isTrickRoom} onClick={() => dispatch({ type: 'TOGGLE_TRICK_ROOM' })}>
          Trick Room
        </Chip>
        <Chip tone="accent" active={state.isGravity} onClick={() => dispatch({ type: 'TOGGLE_GRAVITY' })}>
          Gravity
        </Chip>
      </div>

      <Sheet open={picker !== null} onClose={() => setPicker(null)} title={picker === 'weather' ? 'Weather' : 'Terrain'}>
        {picker === 'weather' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {WEATHER.map((w) => (
              <Chip
                key={w}
                tone="field"
                active={state.weather === w}
                onClick={() => {
                  dispatch({ type: 'SET_WEATHER', payload: w });
                  setPicker(null);
                }}
              >
                {w}
              </Chip>
            ))}
          </div>
        ) : picker === 'terrain' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TERRAIN.map((t) => (
              <Chip
                key={t}
                tone="accent"
                active={state.terrain === t}
                onClick={() => {
                  dispatch({ type: 'SET_TERRAIN', payload: t });
                  setPicker(null);
                }}
              >
                {t}
              </Chip>
            ))}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
