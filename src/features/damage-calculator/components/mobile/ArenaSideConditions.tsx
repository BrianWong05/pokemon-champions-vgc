import React from 'react';
import type { SideState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import { Chip } from '@/design-system/arena';

type Effect = 'isReflect' | 'isLightScreen' | 'isHelpingHand' | 'isTailwind';
const ATTACKER: { label: string; effect: Effect }[] = [
  { label: 'Tailwind', effect: 'isTailwind' }, { label: 'Helping Hand', effect: 'isHelpingHand' },
];
const DEFENDER: { label: string; effect: Effect }[] = [
  { label: 'Reflect', effect: 'isReflect' }, { label: 'Light Screen', effect: 'isLightScreen' },
];

export function ArenaSideConditions({ side, which, dispatch }: {
  side: SideState; which: 'p1' | 'p2'; dispatch: React.Dispatch<CalcAction>;
}) {
  const isP1 = which === 'p1';
  const items = isP1 ? ATTACKER : DEFENDER;
  const tone = isP1 ? 'accent' : 'danger';
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
        {isP1 ? 'Your side' : 'Opp side'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(({ label, effect }) => (
          <Chip key={effect} tone={tone} active={!!side[effect]}
            onClick={() => dispatch({ type: 'TOGGLE_SIDE_EFFECT', payload: { side: which, effect } })}>
            {label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
