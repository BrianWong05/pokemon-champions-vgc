## 1. State Management

- [x] 1.1 Add a new action in the damage calculator state/store to `apply_preset` which accepts preset data and overrides the Pokémon's EVs, IVs, Nature, Hold Item, Ability, and Moves.

## 2. UI Components

- [x] 2.1 Implement a button (e.g., "?" or "Presets") next to the Pokémon selection input in the damage calculator panel.
- [x] 2.2 Create a dropdown or modal component that displays the list of available presets for the currently selected Pokémon.
- [x] 2.3 Implement the "No presets available" empty state (or disable the button) when the list is empty.

## 3. Integration & Testing

- [x] 3.1 Wire the preset selection UI to the `apply_preset` state action to update the calculator immediately upon selection.
- [x] 3.2 Ensure that applying a preset with partial data (e.g. fewer than 4 moves) clears or sets default values for the missing data.
- [x] 3.3 Verify that the UI clearly indicates which preset has been applied or provides feedback of the change.
