## 1. UI Element for Critical Hit Toggle

- [x] 1.1 Identify the appropriate location in `PokemonPanel.tsx` to add the critical hit toggle UI element (e.g., next to move selection).
- [x] 1.2 Implement a toggle button or checkbox for critical hit override.
- [x] 1.3 Ensure the UI element is visually distinct and clearly labeled.

## 2. State Management

- [x] 2.1 Update the `CalcState` interface in `src/pages/DamageCalculator/index.tsx` to include a boolean flag for critical hit override for each side (e.g., `p1ForceCrit`, `p2ForceCrit`).
- [x] 2.2 Update the `initialState` to initialize these new flags to `false`.
- [x] 2.3 Add reducer actions (`TOGGLE_CRIT_OVERRIDE`) to update the state for the critical hit toggle.

## 3. Damage Calculation Logic

- [x] 3.1 Modify the `calculateSmogonDamage` function (or its wrapper) in `src/utils/damage.ts` to accept a boolean flag indicating whether to force a critical hit.
- [x] 3.2 If the force critical hit flag is true, bypass the standard critical hit calculation and apply the 1.5x (or 2x if applicable) multiplier directly.

## 4. Integration and Testing

- [x] 4.1 Connect the UI toggle in `PokemonPanel` to dispatch the `TOGGLE_CRIT_OVERRIDE` action.
- [x] 4.2 Ensure the `isCrit` flag is correctly passed down to the calculation utilities.
- [x] 4.3 Add unit tests for the critical hit override functionality to verify its behavior in different scenarios.