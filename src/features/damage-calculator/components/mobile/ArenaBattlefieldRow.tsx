import React, { useState } from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import { Chip, Sheet } from '@/design-system/arena';

const WEATHER = ['None', 'Sun', 'Rain', 'Sandstorm', 'Snow'] as const;
const TERRAIN = ['None', 'Electric', 'Grassy', 'Misty', 'Psychic'] as const;
const AURAS: { key: 'isFairyAura' | 'isDarkAura' | 'isAuraBreak'; label: string }[] = [
  { key: 'isFairyAura', label: 'Fairy Aura' },
  { key: 'isDarkAura', label: 'Dark Aura' },
  { key: 'isAuraBreak', label: 'Aura Break' },
];

/** ArenaBattlefieldRow — compact field-condition row for the landscape calculator center column. */
export function ArenaBattlefieldRow({ state, dispatch }: { state: CalcState; dispatch: React.Dispatch<CalcAction> }) {
  const [picker, setPicker] = useState<'weather' | 'terrain' | 'auras' | null>(null);
  const anyAura = state.isFairyAura || state.isDarkAura || state.isAuraBreak;

  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
        BATTLEFIELD
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
        <Chip tone="accent" active={!!anyAura} onClick={() => setPicker('auras')}>
          Auras
        </Chip>
      </div>

      <Sheet open={picker !== null} onClose={() => setPicker(null)} title={picker === 'weather' ? 'Weather' : picker === 'terrain' ? 'Terrain' : picker === 'auras' ? 'Auras' : undefined}>
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
        ) : picker === 'auras' ? (
          // Auras are independent toggles (multiple can be on), so the sheet stays open.
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AURAS.map((a) => (
              <Chip
                key={a.key}
                tone="accent"
                active={!!state[a.key]}
                onClick={() => dispatch({ type: 'TOGGLE_FIELD_AURA', payload: a.key })}
              >
                {a.label}
              </Chip>
            ))}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
