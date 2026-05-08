## Why

Competitive players who have already built teams in the team builder need a way to quickly import those specific configurations into the damage calculator. Currently, they must manually re-enter EVs, IVs, natures, and moves, which is time-consuming and error-prone during battle preparation.

## What Changes

- Add a "My Team" import source to both the Attacker and Defender panels in the damage calculator.
- Provide a dropdown to select from the user's saved teams.
- Provide a selection grid or list to pick a specific member from the selected team.
- Automatically populate the entire calculator panel (Species, Form, Item, Ability, Nature, EVs, IVs, and Moves) upon selection.

## Capabilities

### New Capabilities
- `team-calculator-integration`: Capability to bridge saved team data into the damage calculation state.

### Modified Capabilities
- `interactive-damage-calculator-ui`: Add the "My Team" selection UI as an alternative to the "Presets" selection.

## Impact

- `Calculator`: New UI components for team selection.
- `Team State`: Will be accessed by the calculator to provide selection options.
- `Data Mapping`: Ensure team member schema correctly maps to Smogon calc input format.
