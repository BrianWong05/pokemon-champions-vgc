## 1. Logic Implementation (src/utils/damage.ts)

- [x] 1.1 Implement `getSpreadModifier(isSpreadTarget: boolean)`.

## 2. Component Refactoring (src/pages/DamageCalculator/index.tsx)

- [x] 2.1 Update `CalcState` to include `isSpreadTarget: boolean`.
- [x] 2.2 Update `CalcAction` and `calcReducer` to handle `SET_SPREAD_TARGET`.
- [x] 2.3 Integrate `getSpreadModifier` into the `computeResults` calculation pipeline.

## 3. UI Refactoring (src/components/templates/DamageCalculatorTemplate.tsx)

- [x] 3.1 Update `DamageCalculatorTemplateProps` to include `isSpreadTarget` and `onSpreadTargetChange`.
- [x] 3.2 Add a UI toggle for spread damage (e.g., "Single" vs "Spread") in the field conditions section.

## 4. Final Integration

- [x] 4.1 Pass `isSpreadTarget` and the handler from `DamageCalculatorPage` to `DamageCalculatorTemplate`.
- [x] 4.2 Verify that selecting "Spread" reduces move damage by 25%.
