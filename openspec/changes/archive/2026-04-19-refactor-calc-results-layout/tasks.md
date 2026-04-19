## 1. Layout Refactor

- [x] 1.1 Update `DamageCalculatorTemplate.tsx` to use a 1-column top, 2-column bottom layout.
- [x] 1.2 Refactor `ResultsPanel.tsx` to accept an array of results and handle the active selection index.

## 2. Logic Refactor

- [x] 2.1 Update the `useMemo` in `DamageCalculatorPage` to iterate over all 4 moves and produce an array of results.
- [x] 2.2 Update state management to remove `activeMoveIndex` from the move inputs and handle it via the top panel.

## 3. UI Implementation

- [x] 3.1 Implement "Move Result Cards" in `ResultsPanel` with highlighting for the active move.
- [x] 3.2 Implement the large visual HP bar with dynamic coloring and OHKO status text.
- [x] 3.3 Update `AttackerPanel` move rows to remove the selection radio buttons.

## 4. Verification

- [x] 4.1 Verify that results for all 4 moves update instantly when changing stats or nature.
- [x] 4.2 Verify that clicking a result card correctly updates the central HP bar.
- [x] 4.3 Verify that the layout is responsive on mobile (stacking properly).
