## Context

Currently, the `PokemonPanel` displays a `MoveSearchSelect` when a slot is empty, but once a move is selected, it renders a fixed information block with no way to revert or change the selection.

## Goals / Non-Goals

**Goals:**
- Provide a clear UI button to remove a selected move.
- Ensure the removal correctly updates the state in `DamageCalculatorPage`.
- Maintain a clean and consistent UI aesthetic in the move slots.

**Non-Goals:**
- Changing how moves are searched or filtered.
- Persistent move-set saving (beyond the current session state).

## Decisions

### 1. Add `onClearMove` callback to `PokemonPanel`
Instead of overloading `onSelectMove` with a null value, we will add an explicit `onClearMove(index: number)` prop to `PokemonPanel`. This makes the intent clearer in the component API.

### 2. UI Placement: Floating 'X' Button
We will place a small, circular 'X' button in the top-right or right-hand side of the selected move card.
- **Rationale**: This is a standard pattern for "removal" or "closing" items.
- **Alternative**: Placing a "Change" text link. Rejected as it takes more space and might be less intuitive in a compact grid.

### 3. Handle Empty State in Active Tuning
If the currently active move (tracked by `activeMoveIndex`) is cleared, the active tuning panel should either show a "No move selected" message or hide itself.
- **Decision**: Keep it simple - since `activeMove` will become null, the existing `activeMove && (...)` check in `PokemonPanel.tsx` will naturally hide the tuning panel.

## Risks / Trade-offs

- **Accidental Deletions**: Users might click the 'X' accidentally.
- **Mitigation**: Use a small, low-contrast button that gains contrast on hover, and ensure it's not positioned where common clicks occur.
