## 1. State Management (src/pages/DamageCalculator/index.tsx)

- [x] 1.1 Add `SET_TYPE` action to `CalcAction`.
- [x] 1.2 Handle `SET_TYPE` in `calcReducer`.
- [x] 1.3 Ensure `SELECT_POKEMON` reducer logic correctly sets the species' default types.
- [x] 1.4 Add `isTypeOverridden` to `SideState` and `TOGGLE_TYPE_OVERRIDE` action.

## 2. Core Logic (src/utils/damage.ts)

- [x] 2.1 Update `mapToSmogonPokemon` to accept base types.
- [x] 2.2 Implement conditional logic to use either base types or overrides based on `isTypeOverridden`.
- [x] 2.3 **Fix**: Explicitly set the `types` property on the Smogon `Pokemon` object to ensure the engine respects overrides for effectiveness.

## 3. UI Implementation (src/components/organisms/PokemonPanel.tsx)

- [x] 3.1 Implement type selection UI (Primary and Secondary) in the `PokemonPanel`.
- [x] 3.2 Add a checkbox to activate/deactivate the manual type override.
- [x] 3.3 Ensure the UI greys out inactive dropdowns when the override is disabled.
- [x] 3.4 **Fix**: Update the top-level `TypeBadge` display to reflect the active types (including overrides) when the toggle is active.

## 4. Verification

- [x] 4.1 Verify that the calculation only changes when the "Manual Type Override" checkbox is checked.
- [x] 4.2 Verify that unchecking the box reverts the calculation and the UI badges to species base types.
- [x] 4.3 Verify that changing species resets the overrides to new base types.
