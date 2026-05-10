## Why
When navigating search dropdowns with the keyboard, the highlighted item often remains clipped if it is not currently within the visible scroll area of the dropdown.

## What Changes
- Implement auto-scroll logic in `PokemonSearchSelect` and `MoveSearchSelect` to keep the active item in view.

## Capabilities

### New Capabilities
- `dropdown-auto-scroll`: Enabling auto-scroll functionality for highlighted items in dropdowns.

### Modified Capabilities
- `keyboard-nav-support`: Enhancing navigation support.

## Impact
- Better UX for users using keyboard-only navigation in search dropdowns.
