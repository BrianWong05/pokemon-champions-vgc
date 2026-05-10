## Why
The move search dropdown lacks keyboard navigation, mirroring the previously identified usability issue with the Pokémon search dropdown. Providing consistent navigation (Up/Down for selection, Enter to confirm) is necessary.

## What Changes
- Apply keyboard navigation logic to `MoveSearchSelect` component.

## Capabilities

### New Capabilities
- `move-keyboard-nav-support`: Adding keyboard event listeners and navigation logic to the move search dropdown.

### Modified Capabilities
- 

## Impact
- Improved keyboard-only user experience in the Damage Calculator and Team Builder move selection areas.
