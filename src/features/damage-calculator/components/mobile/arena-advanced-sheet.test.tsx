// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaAdvancedSheet } from './ArenaAdvancedSheet';
import type { CalcState, SideState } from '@/features/damage-calculator/hooks/useCalculatorState';

const sampleSide = {
  selectedId: null,
  hpPercent: 100,
  stages: {},
  isReflect: false,
  isLightScreen: false,
  isAuroraVeil: false,
  isHelpingHand: false,
  isFriendGuard: false,
  isTailwind: false,
  moves: [],
  movesForceCrit: [],
  movesHits: [],
  faintedCount: 0,
  isTypeOverridden: false,
  type1: null,
  type2: null,
} as unknown as SideState;

const sampleState = {
  p1: sampleSide,
  p2: sampleSide,
  isFairyAura: false,
  isDarkAura: false,
  isAuraBreak: false,
} as unknown as CalcState;

// Row renders `<span>{label}</span>` immediately followed by the bare Toggle
// switch (a sibling `<span onClick>`); there's no accessible name wiring
// (no <label htmlFor>/aria-label) on the switch itself, so target it via
// the label's next sibling — same DOM shape for every Row+Toggle pair.
function clickToggleFor(labelText: string) {
  const label = screen.getByText(labelText);
  fireEvent.click(label.nextElementSibling as Element);
}

describe('ArenaAdvancedSheet — Field auras', () => {
  it('dispatches TOGGLE_FIELD_AURA with the correct payload for each aura toggle', () => {
    const dispatch = vi.fn();
    render(
      <ArenaAdvancedSheet
        open
        onClose={() => {}}
        side="p1"
        state={sampleState}
        dispatch={dispatch}
        onApplySpread={() => {}}
        onResetBuild={() => {}}
        onImportShowdown={() => {}}
      />,
    );

    clickToggleFor('Fairy aura');
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_FIELD_AURA', payload: 'isFairyAura' });

    clickToggleFor('Dark aura');
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_FIELD_AURA', payload: 'isDarkAura' });

    clickToggleFor('Aura break');
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_FIELD_AURA', payload: 'isAuraBreak' });
  });
});
