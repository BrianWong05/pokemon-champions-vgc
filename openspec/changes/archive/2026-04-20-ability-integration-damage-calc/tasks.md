## 1. Core Logic (src/utils/damage.ts)

- [x] 1.1 Implement `getAbilityModifier(abilityName, role, stat)` with support for Huge Power, Pure Power, and Guts.
- [x] 1.2 Update `calculateStat` to include the ability multiplier in the formula.

## 2. State and Data Fetching (src/pages/DamageCalculator/index.tsx)

- [x] 2.1 Update `SideState` and `initialSide` to include `abilities` array and `activeAbility` string.
- [x] 2.2 Update `SELECT_POKEMON` action in `calcReducer` to reset abilities and default the active ability.
- [x] 2.3 Update `SELECT_POKEMON` effect/handler to fetch legal abilities from the database.
- [x] 2.4 Add `SET_ABILITY` action to the reducer to update the selected ability.

## 3. UI Refactoring (src/components/organisms/PokemonPanel.tsx)

- [x] 3.1 Update `PokemonPanelProps` and component to handle ability selection and display.
- [x] 3.2 Add a `<select>` dropdown for abilities below the Pokémon search/info section.
- [x] 3.3 Pass down the necessary ability-related state and handlers from `DamageCalculator`.

## 4. Integration and Verification

- [x] 4.1 Verify that Huge Power correctly doubles the Attack stat in the damage calculation.
- [x] 4.2 Verify that changing the ability updates the damage results in real-time.
