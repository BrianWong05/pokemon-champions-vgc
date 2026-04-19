## Why

The current Damage Calculator requires manual entry of move power and category. By adding dynamic move selection based on the selected Attacker, we can improve the tool's accuracy and usability. Users will be able to select from the actual move-set available to a Pokémon, with stats like power, category, and STAB being automatically determined from the database.

## What Changes

- Implement a dynamic "Move" select input in the `AttackerPanel`.
- Fetch moves legal for the selected Attacker from the `pokemon_moves` and `moves` tables.
- Automatically update move power, category, and STAB multiplier upon move selection.
- Update the damage calculation logic to use the correct attacker stat (Atk vs SpA) and defender stat (Def vs SpD) based on the move's category.
- Display move details (Type, Category, Power) next to the selection dropdown.

## Capabilities

### New Capabilities
- `move-selection-integration`: Logic and UI for querying and selecting moves specific to a Pokémon.

### Modified Capabilities
- `interactive-damage-calculator-ui`: Enhance the calculator UI with dynamic move selection and automated stat matching.

## Impact

- `src/pages/DamageCalculator/index.tsx`: Refactored to handle move fetching and category-based stat selection.
- `src/components/organisms/AttackerPanel.tsx`: Updated to include move selection UI.
- `src/db/`: Used for Drizzle queries to fetch Pokémon move-sets.
