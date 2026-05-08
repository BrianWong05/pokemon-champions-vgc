## Why

Currently, when users select a nature in the Pokémon editor, it's not explicitly clear which stats are being boosted or hindered. Displaying this information directly next to the nature selection improves UX and prevents configuration errors.

## What Changes

- Update the nature selection UI to show the corresponding stat modifiers (e.g., "+Atk, -SpA").

## Capabilities

### New Capabilities
- `nature-modifier-display`: Displays stat modifiers for the selected nature in the UI.

### Modified Capabilities

## Impact

- `src/components/organisms/PokemonConfigForm.tsx`: Update the nature selection dropdown or adjacent display.
