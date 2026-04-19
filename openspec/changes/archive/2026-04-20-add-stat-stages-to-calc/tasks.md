## 1. Data & State Management

- [x] 1.1 Implement `getStageMultiplier(stage: number): number` in `src/utils/damage.ts`.
- [x] 1.2 Update `SideState` in `DamageCalculatorPage` to include a `stages` object (Atk, Def, SpA, SpD, Spe).
- [x] 1.3 Add `SET_STAT_STAGE` action to `calcReducer` with clamping logic (-6 to +6).

## 2. Component Refactoring

- [x] 2.1 Update `StatGrid` and `StatRow` to accept `stages` and an `onStageChange` callback.
- [x] 2.2 Add compact increment/decrement stage controls to `StatRow` (excluding HP).
- [x] 2.3 Implement color-coded styling for stages (Green for +, Red for -) in the UI.

## 3. Calculation Integration

- [x] 3.1 Update the `computeResults` block in `DamageCalculatorPage` to apply stage multipliers to attacker and defender stats.
- [x] 3.2 Ensure the order of operations: Nature first, then Stages.

## 4. Verification

- [x] 4.1 Verify that stat stages clamp at -6 and +6.
- [x] 4.2 Verify that a +2 boost results in a 2x stat multiplier.
- [x] 4.3 Verify that the damage results in the top dashboard update instantly when toggling stages.
