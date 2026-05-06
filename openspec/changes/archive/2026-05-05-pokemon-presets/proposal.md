## Why

Currently, when users open the Damage Calculator, they have to manually input all aspects of a Pokemon, including its Nature, EV spreads, Items, and Moves, to evaluate damage calculations. Adding preset Pokemon configurations (e.g., standard VGC sets) will drastically speed up calculations and provide a smoother user experience, especially for common meta threats.

## What Changes

- Introduce a data structure/repository for storing popular or standard Pokemon presets (including EVs, IVs, Nature, Item, Ability, and Moves).
- Update the Damage Calculator UI to allow selecting a preset configuration.
- Automatically populate the Pokemon's form fields when a preset is selected.

## Capabilities

### New Capabilities
- `pokemon-presets`: Management and selection of predefined Pokemon configurations for the calculator.

### Modified Capabilities
- `interactive-damage-calculator-ui`: Adding preset selection UI and handling preset application to the existing form state.

## Impact

- **Data:** Need a new JSON or structured data file/database table to store preset sets.
- **UI:** Modifications to the Pokemon selection area in the Damage Calculator to support picking a preset.
- **Logic:** State management in the Damage Calculator to apply all aspects of a preset when chosen.