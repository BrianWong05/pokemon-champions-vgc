import React from 'react';
import ResultsPanel, { DamageResult } from '@/components/organisms/ResultsPanel';
import { CalcState, CalcAction } from '@/pages/DamageCalculator/hooks/useCalculatorState';

interface Props {
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  p1Results: (DamageResult | null)[];
  p2Results: (DamageResult | null)[];
  p1MaxHp: number;
  p2MaxHp: number;
}

export const ResultSummary: React.FC<Props> = ({ 
  state, 
  dispatch, 
  p1Results, 
  p2Results, 
  p1MaxHp, 
  p2MaxHp 
}) => {
  return (
    <ResultsPanel 
      p1Results={p1Results}
      p1ActiveIndex={state.p1.activeMoveIndex}
      onSelectP1Active={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p1', index } })}
      p2MaxHp={p2MaxHp}
      p2Results={p2Results}
      p2ActiveIndex={state.p2.activeMoveIndex}
      onSelectP2Active={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p2', index } })}
      p1MaxHp={p1MaxHp}
      p1HpPercent={state.p1.hpPercent}
      p2HpPercent={state.p2.hpPercent}
    />
  );
};
