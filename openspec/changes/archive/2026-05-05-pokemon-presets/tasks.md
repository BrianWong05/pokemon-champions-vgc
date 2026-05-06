## 1. Data Structure

- [x] 1.1 Create `src/utils/pokemon-presets.ts`.
- [x] 1.2 Define the `PokemonPreset` interface/type.
- [x] 1.3 Add a few initial standard VGC presets (e.g., Flutter Mane, Incineroar, Rillaboom) exporting them as an array.

## 2. UI Updates

- [x] 2.1 Update the `PokemonPanel` (or equivalent component handling individual Pokemon state in `DamageCalculator`) to include a `<select>` dropdown for presets.
- [x] 2.2 Wire up the dropdown's `onChange` event to a handler that finds the selected preset from the data array.

## 3. Logic and State Management

- [x] 3.1 Implement a function in the damage calculator's state management (or local component state) that takes a `PokemonPreset` and completely overwrites the current `PokemonState` (Species, Nature, EVs, Item, Ability, Moves).
- [x] 3.2 Ensure that applying the preset correctly triggers a recalculation of the damage ranges at the top of the dashboard.