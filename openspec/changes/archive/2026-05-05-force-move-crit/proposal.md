## Why

The damage calculator currently lacks a way to simulate critical hits on demand. For testing purposes, debugging, or specific battle scenarios, it's necessary to be able to force a move to be a critical hit to observe its damage output without relying on the random chance involved in critical hits.

## What Changes

- Add a UI element (likely a button or checkbox) next to the move selection for each Pokémon.
- This UI element will allow the user to toggle a "critical hit" status for the selected move.
- Update the damage calculation logic to respect this critical hit toggle.

## Capabilities

### New Capabilities
- `critical-hit-override`: Functionality to force a critical hit for a selected move.

### Modified Capabilities
- `damage-calculation-logic`: This will be modified to incorporate the critical hit override.

## Impact

- **UI Components**: `MoveSearchSelect` or a related component might need modification to display the toggle. `PokemonPanel` will need to render this new UI element.
- **Damage Calculation Logic**: The core calculation function needs to accept and process the critical hit status.
