## Why

The current Showdown import only supports single Pokémon. Teams often consist of 6 Pokémon, and users frequently want to import an entire team to the "Teams" management section or directly into the Damage Calculator's team slots. This will greatly streamline teambuilding.

## What Changes

- Add an "Import Team" button to the Teams management page.
- Extend the Showdown parser to handle multiple sets separated by newlines.
- Update the state management to support batch loading of up to 6 Pokémon at once.

## Capabilities

### New Capabilities
- `team-showdown-import`: Capability to parse multiple Showdown sets and manage a team-wide state update.

### Modified Capabilities
- `team-management`: Update the UI to include a team-level import trigger.

## Impact

- **UI**: Added "Import Team" button.
- **State Management**: New batch import actions for the team state.
- **Utility**: Parser already handles multiple sets (if integrated correctly), mainly needs batch state handling.
