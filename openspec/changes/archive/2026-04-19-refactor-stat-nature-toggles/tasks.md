## 1. State & Reducer Refactor

- [x] 1.1 Update `SideState` in `DamageCalculatorPage` to include `boostedStat` and `hinderedStat` (string | null).
- [x] 1.2 Implement `TOGGLE_NATURE` action in `calcReducer` with mutual exclusivity logic.
- [x] 1.3 Remove the old global `nature` state from `SideState` and relevant actions.

## 2. Component Updates

- [x] 2.1 Refactor `StatGrid.tsx` and `StatRow` to accept `boostedStat` and `hinderedStat` props.
- [x] 2.2 Add `+` and `-` toggle buttons to `StatRow` for all stats except HP.
- [x] 2.3 Implement visual styling for active Nature toggles using Tailwind CSS.
- [x] 2.4 Update `PokemonPanel.tsx` to remove the global Nature dropdown and pass Nature state to `StatGrid`.

## 3. Logic Integration

- [x] 3.1 Update the `calculateStat` utility or the `useMemo` calculation block to derive multipliers based on the boosted/hindered markers.
- [x] 3.2 Ensure bidirectional damage results in `ResultsPanel` react correctly to granular Nature changes.

## 4. Verification

- [x] 4.1 Verify that clicking `+` on Atk boosts it and clicking `+` on Spe clears the Atk boost.
- [x] 4.2 Verify that a stat cannot be both boosted and hindered.
- [x] 4.3 Verify that the stat totals in the UI and the damage results in the top panel update correctly.
