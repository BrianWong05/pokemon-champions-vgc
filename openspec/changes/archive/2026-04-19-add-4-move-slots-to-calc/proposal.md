## Why

In Pokémon, a Pokémon can have a maximum of 4 moves at a time. The current Damage Calculator only supports selecting a single move. By implementing 4 move slots, we align the tool with the actual game rules and allow players to build a full move-set for their Attacker, quickly switching between them to see different damage outcomes without re-searching.

## What Changes

- Update `DamageCalculatorPage` state to manage an array of 4 moves for the Attacker.
- Track a `selectedMoveIndex` to determine which of the 4 moves is currently active for calculation.
- Refactor `AttackerPanel` to display 4 move rows.
- Each move row will allow searching and selecting a move, displaying its type, category, and power.
- Clicking a move slot will set it as the "active" move for the damage result.

## Capabilities

### New Capabilities
- `multi-move-set-management`: Ability to define and manage a collection of up to 4 moves for a single Pokémon.

### Modified Capabilities
- `interactive-damage-calculator-ui`: Refactor the move selection area to support multiple slots and active-move switching.

## Impact

- `src/pages/DamageCalculator/index.tsx`: State, reducer, and calculation logic updated to handle 4 move slots.
- `src/components/organisms/AttackerPanel.tsx`: UI refactored to show 4 move selection rows.
