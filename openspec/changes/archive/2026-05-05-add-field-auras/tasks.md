## 1. State Management (src/pages/DamageCalculator/index.tsx)

- [x] 1.1 Update `CalcState` interface to include `isFairyAura`, `isDarkAura`, and `isAuraBreak`.
- [x] 1.2 Add `TOGGLE_FIELD_AURA` action type to `CalcAction` and handle it in `calcReducer`.
- [x] 1.3 Update `initialState` to set these aura flags to `false` by default.

## 2. Core Logic Updates (src/utils/damage.ts)

- [x] 2.1 Update `mapToSmogonField` signature to accept `isFairyAura`, `isDarkAura`, and `isAuraBreak`.
- [x] 2.2 Implement the mapping of these flags to the Smogon `Field` constructor.
- [x] 2.3 Remove legacy Aura logic from manual base power or damage modifier functions (if any exist in `src/utils/damage.ts`).

## 3. UI Implementation (src/pages/DamageCalculator/index.tsx)

- [x] 3.1 Implement a `FieldAuraSelector` component (or add to existing Field options) to toggle the three auras.
- [x] 3.2 Ensure the `FieldAuraSelector` is integrated into the `DamageCalculatorPage` layout.
- [x] 3.3 Verify that toggling an aura correctly triggers a recalculation of damage results.

## 4. Verification

- [x] 4.1 Verify that Fairy Aura increases Fairy move damage (e.g., Moonblast).
- [x] 4.2 Verify that Aura Break correctly reduces damage when paired with an active aura.
- [x] 4.3 Verify that the aura boost applies to both P1 and P2 regardless of which Pokémon is currently active (field-wide test).
