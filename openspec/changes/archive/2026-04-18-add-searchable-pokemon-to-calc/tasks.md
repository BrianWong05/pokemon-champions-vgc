## 1. Data Fetching

- [x] 1.1 Implement a query in `getDb` context to fetch all Pokémon legal in "Regulation M-A" with their base stats.
- [x] 1.2 Expose the Pokémon list to the `DamageCalculatorPage`.

## 2. Component Development

- [x] 2.1 Create `src/components/molecules/PokemonSearchSelect.tsx` with filtering and thumbnail display.
- [x] 2.2 Update `AttackerPanel` and `DefenderPanel` to include the `PokemonSearchSelect` component.

## 3. State Integration

- [x] 3.1 Update the `useReducer` logic in `DamageCalculatorPage` to handle Pokémon selection and stat population.
- [x] 3.2 Ensure the UI recalculates damage immediately upon Pokémon switch.

## 4. Verification

- [x] 4.1 Verify that searching for a Pokémon by name (En/Zh) works as expected.
- [x] 4.2 Verify that selecting a Pokémon correctly populates all base stats for both sides.
- [x] 4.3 Verify that the visual thumbnail updates correctly.
