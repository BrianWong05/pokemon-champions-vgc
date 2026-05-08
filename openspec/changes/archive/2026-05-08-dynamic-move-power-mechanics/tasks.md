## 1. Core Logic Implementation

- [x] 1.1 Create `getMovePowerModifier` function in `src/utils/damage.ts` to calculate dynamic power for "Last Respects".
- [x] 1.2 Update the `computeResults` pipeline in `src/pages/DamageCalculator/index.tsx` to call this utility.
- [x] 1.3 Update damage calculation logic to pass the modified base power to the Smogon engine.

## 2. UI Updates

- [x] 2.1 Add a "Fainted Pokémon Count" field to the "Battle State" or "Field Effects" section of the calculator.
- [x] 2.2 Update the calculator's `state` and `reducer` to track this fainted count.

## 3. Verification

- [x] 3.1 Verify "Last Respects" base power correctly updates as the fainted Pokémon count changes.
- [x] 3.2 Ensure the impact range display reflects the dynamic power correctly.
