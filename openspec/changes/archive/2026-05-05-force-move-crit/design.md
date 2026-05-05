## Context

The current damage calculation does not have a mechanism to force a critical hit. This feature is useful for testing, debugging, and specific battle simulations where critical hit randomness should be bypassed.

## Goals / Non-Goals

**Goals:**
- Add a UI element (e.g., a button or checkbox) next to each move selection.
- Allow users to toggle critical hit status for the selected move.
- Ensure the damage calculation correctly applies critical hit multipliers when this toggle is active.

**Non-Goals:**
- We are not changing the core critical hit calculation logic of `@smogon/calc`. We are adding a user-controllable override.
- This feature is intended for debugging/testing and may not be exposed in a production build without further consideration.

## Decisions

- **UI Element Placement**: A toggle button or checkbox will be placed adjacent to the move selection in the `PokemonPanel`.
- **State Management**: The critical hit status will be stored in the `CalcState` for each side (p1, p2), similar to how other effects are managed.
- **Calculation Logic**: The `calculateSmogonDamage` function will be modified to accept a boolean flag indicating whether to force a critical hit. This flag will bypass the standard critical hit calculation and apply the 1.5x or 2x multiplier directly.

## Risks / Trade-offs

- [Risk] Overriding critical hit chance might interfere with other mechanics that depend on the base critical hit chance calculation.
  - *Mitigation*: Ensure the critical hit toggle is handled in a way that doesn't affect other aspects of the game logic, or clearly isolate its impact to damage calculation.
- [Risk] UI clutter: Adding too many toggles can make the interface busy.
  - *Mitigation*: Design the UI element to be compact and unobtrusive.
