## 1. Logic Implementation (src/utils/damage.ts)

- [x] 1.1 Implement `getModifiedMoveType(originalType, moveName, ability)` with support for Pixilate, Refrigerate, Aerilate, Galvanize, and Liquid Voice.
- [x] 1.2 Update `getBasePowerModifier` to accept `modifiedType` and apply the 1.2x boost for "-ate" abilities.

## 2. Component Refactoring (src/pages/DamageCalculator/index.tsx)

- [x] 2.1 Update `DamageResult` interface to include `modifiedType`.
- [x] 2.2 Update `computeResults` pipeline to calculate `modifiedType` first and use it for STAB, BP, and Effectiveness.

## 3. UI Implementation (src/components/organisms/ResultsPanel.tsx)

- [x] 3.1 Update the results card to display the modified type in parentheses next to the move name if it differs from the original type.

## 4. Verification

- [x] 4.1 Verify Pixilate correctly changes Normal -> Fairy and applies 1.2x boost + STAB.
- [x] 4.2 Verify Liquid Voice correctly changes Hyper Voice -> Water.
- [x] 4.3 Verify the UI accurately reflects the type change.
