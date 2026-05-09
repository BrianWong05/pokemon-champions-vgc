## 1. Preparation

- [x] 1.1 Create `src/pages/DamageCalculator/hooks` and `src/pages/DamageCalculator/components` directories
- [x] 1.2 Create `src/utils/damage-calc` directory for pure calculation functions

## 2. Logic Extraction

- [x] 2.1 Extract damage calculation logic from `src/utils/damage.ts` to `src/utils/damage-calc/`
- [x] 2.2 Create `src/pages/DamageCalculator/hooks/useCalculatorState.ts` and migrate state management from `index.tsx`

## 3. UI Refactoring

- [x] 3.1 Extract `AttackerPanel` organism from `DamageCalculator`
- [x] 3.2 Extract `DefenderPanel` organism from `DamageCalculator`
- [x] 3.3 Extract `ResultSummary` organism from `DamageCalculator`
- [x] 3.4 Refactor `DamageCalculator/index.tsx` to act only as an orchestrator

## 4. Verification

- [x] 4.1 Verify damage calculation parity after refactor (unit tests)
- [x] 4.2 Verify UI functionality in Calculator remains identical post-refactor
