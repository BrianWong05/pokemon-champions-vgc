## Why
Currently, the Pokémon search dropdown requires mouse interaction to select an item. Keyboard navigation (Up/Down for selection, Enter to confirm) is essential for efficient team building and stat calculation.

## What Changes
- Enhance `PokemonSearchSelect` to listen for keyboard events.
- Maintain an internal `activeIndex` for keyboard highlighting.

## Capabilities

### New Capabilities
- `keyboard-nav-support`: Adding keyboard event listeners and navigation logic to search dropdowns.

### Modified Capabilities
- 

## Impact
- Improved keyboard-only user experience in the Damage Calculator and Team Builder.
