import React, { useState } from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import { Card, ChipGroup, Chip, Toggle, Icon, Badge } from '@/design-system/arena';

const WEATHER = ['None', 'Sun', 'Rain', 'Sandstorm', 'Snow'] as const;
const TERRAIN = ['None', 'Electric', 'Grassy', 'Misty', 'Psychic'] as const;
const AURAS: { label: string; key: 'isFairyAura' | 'isDarkAura' | 'isAuraBreak' }[] = [
  { label: 'Fairy aura', key: 'isFairyAura' },
  { label: 'Dark aura', key: 'isDarkAura' },
  { label: 'Aura break', key: 'isAuraBreak' },
];

/** ArenaFieldConditions — field/global toggles as DS chip groups + a Gravity switch. */
export function ArenaFieldConditions({ state, dispatch }: { state: CalcState; dispatch: React.Dispatch<CalcAction> }) {
  const [open, setOpen] = useState(true);
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Field conditions"
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 'var(--sp-4)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <Icon name="cloud-sun" size={18} color="var(--field)" />
        <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--ink-1)' }}>Field conditions</span>
        {state.weather !== 'None' && <Badge tone="field">{state.weather}</Badge>}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="var(--ink-3)" />
      </button>
      {open && (
        <div style={{ padding: '0 0 var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ChipGroup label="Weather">
            {WEATHER.map((w) => (
              <Chip key={w} tone="field" active={state.weather === w} onClick={() => dispatch({ type: 'SET_WEATHER', payload: w })}>{w}</Chip>
            ))}
          </ChipGroup>
          <ChipGroup label="Terrain">
            {TERRAIN.map((t) => (
              <Chip key={t} active={state.terrain === t} onClick={() => dispatch({ type: 'SET_TERRAIN', payload: t })}>{t}</Chip>
            ))}
          </ChipGroup>
          <ChipGroup label="Target">
            <Chip active={!state.isSpreadTarget} onClick={() => dispatch({ type: 'SET_SPREAD_TARGET', payload: false })}>Single</Chip>
            <Chip active={state.isSpreadTarget} onClick={() => dispatch({ type: 'SET_SPREAD_TARGET', payload: true })}>Spread</Chip>
          </ChipGroup>
          <ChipGroup label="Auras">
            {AURAS.map((a) => (
              <Chip key={a.key} active={state[a.key]} onClick={() => dispatch({ type: 'TOGGLE_FIELD_AURA', payload: a.key })}>{a.label}</Chip>
            ))}
          </ChipGroup>
          <ChipGroup label="Room">
            <Chip active={state.isTrickRoom} onClick={() => dispatch({ type: 'TOGGLE_TRICK_ROOM' })}>Trick Room</Chip>
          </ChipGroup>
          <div style={{ padding: '0 var(--gutter)' }}>
            <div style={{ paddingTop: 12, borderTop: '1px solid var(--line-1)' }}>
              <Toggle label="Gravity" on={state.isGravity} onChange={() => dispatch({ type: 'TOGGLE_GRAVITY' })} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
