## 1. State Refactor

- [x] 1.1 Update `CalcState` in `DamageCalculatorPage` to use a `moves` array (4 slots) and `activeMoveIndex`.
- [x] 1.2 Update `calcReducer` to handle `SELECT_MOVE_FOR_SLOT` and `SET_ACTIVE_MOVE_SLOT`.
- [x] 1.3 Update `SELECT_POKEMON` to reset all 4 move slots for the Attacker.

## 2. UI Refactoring

- [x] 2.1 Refactor `AttackerPanel` to render 4 move slots.
- [x] 2.2 Implement a mechanism to toggle the "active" move slot (e.g., clicking a radio button or the slot row).
- [x] 2.3 Ensure `MoveSearchSelect` is integrated into each of the 4 slots.

## 3. Logic Integration

- [x] 3.1 Update the damage calculation `useMemo` block to derive move properties (power, type, category) from the `active` move in the `moves` array.
- [x] 3.2 Ensure STAB and Effectiveness are correctly computed for the active move.

## 4. Verification

- [x] 4.1 Verify that picking a move for Slot 1 doesn't affect Slot 2.
- [x] 4.2 Verify that clicking Slot 2 updates the damage result to Slot 2's move properties.
- [x] 4.3 Verify that changing the Attacker resets all move slots.
