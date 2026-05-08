## Why

The current interactive damage calculator allows manual configuration of a Pokémon's stats, nature, item, and moves. However, it lacks a UI feature to quickly load predefined or popular VGC sets (presets). Adding preset selection solves the problem of tedious manual entry and allows players to quickly evaluate damage calculations against common meta builds.

## What Changes

- Add a UI mechanism (e.g., a dropdown, modal, or button) next to or integrated with the Pokémon selection input in the damage calculator to browse and select available presets for that Pokémon.
- When a preset is selected, automatically populate the Pokémon's stats (EVs, IVs), Nature, Hold Item, Ability, and Moves.
- Ensure the selected preset state is clearly indicated in the UI.

## Capabilities

### New Capabilities
- `calculator-preset-selection`: Selecting presets within the interactive damage calculator to populate pokemon configuration.

### Modified Capabilities
- `interactive-calculator-ui`: Modifying the calculator UI to include the preset selection mechanism.

## Impact

- Affects the `interactive-calculator-ui` components (like the Pokemon selector and stat panels).
- May interact with the `pokemon-presets` data structure.
- Simplifies user experience for quick calculations.
