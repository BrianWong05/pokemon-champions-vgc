## Context

Pokémon are limited to 4 moves. To provide a better team-building experience, the Damage Calculator should allow users to fill up to 4 move slots for the Attacker and select which one is being used for the current calculation.

## Goals / Non-Goals

**Goals:**
- Provide 4 distinct move slots in the `AttackerPanel`.
- Allow searching and selecting a move for each slot.
- Allow selecting an "active" move for the damage result calculation.
- Display move details (Power, Category, Type) for all selected moves.

**Non-Goals:**
- Supporting more than 4 moves.
- Saving move-sets to a database (local session state only).

## Decisions

- **State Schema**:
    - The `move` state in `DamageCalculatorPage` will be refactored to:
      ```typescript
      moves: (MoveData | null)[]; // Array of exactly 4 items
      activeIndex: number; // 0 to 3
      ```
- **UI Refactor**:
    - `AttackerPanel` will render 4 rows.
    - Each row will use the `MoveSearchSelect` but will also handle its own slot index.
    - An "active" indicator (e.g., a radio button or highlighted border) will show which move is being calculated.
- **Auto-Calculations**:
    - STAB and Type Effectiveness will be computed based on the `moves[activeIndex]`.

## Risks / Trade-offs

- **[Risk]** UI clutter with 4 move rows → **[Mitigation]** Use a compact design for each row, potentially hiding the "Search" input once a move is selected and replacing it with a "Clear/Change" button to save vertical space.
- **[Risk]** State complexity → **[Mitigation]** The `useReducer` already handles complex state; adding array-based move management is a natural extension.
