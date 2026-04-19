## Why

Currently, once a move is selected in one of the 4 slots, there is no UI mechanism for the user to change that selection or clear the slot. This forces users to either reload the page or change the Pokémon to reset the move-set, which is a poor user experience for damage calculation tuning.

## What Changes

- Add a "Clear" or "Remove" action (e.g., an 'X' button) to each move slot when a move is already selected.
- Clicking this action SHALL reset the slot to an empty state, re-enabling the search/selection interface.
- Ensure that clearing a move updates the "Active Tuning" panel and the damage results accordingly.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `multi-move-set-management`: Add requirement for clearing/modifying selected moves within the 4 slots.

## Impact

- `src/components/organisms/PokemonPanel.tsx`: UI changes to add a removal button to selected move items.
- `src/pages/DamageCalculator/index.tsx`: Ensure the state management correctly handles clearing a move slot.
- `src/utils/damage.ts`: Potential impact if damage calculations need to handle null moves more gracefully (though likely already handled).
