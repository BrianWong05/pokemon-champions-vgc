## Why

The current Damage Calculator requires manual entry of base stats, which is slow and error-prone. By adding a searchable Pokémon selection for both the Attacker and Defender, players can quickly select their team members and opponents, auto-populating their base stats from the database. This significantly improves the tool's usability and accuracy.

## What Changes

- Implement a searchable dropdown component (`PokemonSearchSelect`) to find and select Pokémon legal in "Regulation M-A".
- Refactor `DamageCalculatorPage` to fetch and store a list of all legal Pokémon.
- Update Attacker and Defender panels to integrate the new selection logic.
- Ensure base stats are automatically populated upon selecting a Pokémon, while maintaining Nature and SP selections.
- Display the selected Pokémon's thumbnail next to the selection field.

## Capabilities

### New Capabilities
- `searchable-pokemon-selection`: Logic and UI for filtering and selecting Pokémon from the database.

### Modified Capabilities
- `interactive-damage-calculator-ui`: Enhance the existing calculator UI to integrate database-driven Pokémon selection.

## Impact

- `src/pages/DamageCalculator/`: Refactored to handle database fetching and integration.
- `src/components/molecules/PokemonSearchSelect.tsx`: New molecule component.
- `src/services/pokemon.ts`: Potential update to support broad Pokémon data fetching.
