## 1. State & Model Refactor

- [x] 1.1 Update `SideState` and `PokemonBaseStats` to include `type1` and `type2`.
- [x] 1.2 Add `type` to the `move` state in `DamageCalculatorPage`.
- [x] 1.3 Update `fetchPokemon` query in `DamageCalculatorPage` to select Pokémon types.

## 2. Component Updates

- [x] 2.1 Refactor `AttackerPanel` to include a `TypeIcon` or simple select for move type.
- [x] 2.2 Remove the manual `STAB` checkbox from the UI.
- [x] 2.3 Ensure `SELECT_POKEMON` action stores types in the reducer.

## 3. Logic & Integration

- [x] 3.1 Implement automated `isStab` calculation in the `useMemo` block based on attacker types and move type.
- [x] 3.2 Update `ResultsPanel` to display a "STAB" badge when the multiplier is active.

## 4. Verification

- [x] 4.1 Verify STAB applies automatically for matching types (e.g., Fire move on Charizard).
- [x] 4.2 Verify STAB does not apply for non-matching types.
