## 1. State Management Update

- [x] 1.1 Add `CLEAR_MOVE_SLOT` action to `calcReducer` in `src/pages/DamageCalculator/index.tsx`.
- [x] 1.2 Update the `DamageCalculatorPage` to pass `onClearMove` handlers to both `PokemonPanel` instances.

## 2. UI Implementation

- [x] 2.1 Update `PokemonPanelProps` interface in `src/components/organisms/PokemonPanel.tsx` to include `onClearMove: (index: number) => void`.
- [x] 2.2 Add a removal button (e.g., an 'X' icon or button) to the selected move display in `PokemonPanel.tsx`.
- [x] 2.3 Style the removal button for better visibility and hover feedback.
- [x] 2.4 Connect the button click event to the `onClearMove` prop.

## 3. Verification & Polish

- [x] 3.1 Verify that clicking the removal button clears the move slot and shows the search select again.
- [x] 3.2 Verify that clearing the move currently being "tuned" correctly hides the tuning panel.
- [x] 3.3 Verify that clearing a move updates the damage calculation results (e.g., show "No move selected" or --).
