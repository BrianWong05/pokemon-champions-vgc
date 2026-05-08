## 1. Core Logic: Showdown Parser

- [x] 1.1 Create `src/utils/showdown-parser.ts` with basic regex patterns for Species, Item, and Ability.
- [x] 1.2 Implement parsing for Nature and Stats (EVs/IVs), including the conversion to internal `sp` values.
- [x] 1.3 Implement move parsing (up to 4 moves).
- [x] 1.4 Add unit tests for the parser in `src/utils/showdown-parser.test.ts` covering various edge cases.

## 2. UI Components

- [x] 2.1 Create a `ShowdownImportModal` component (or similar) with a textarea for input.
- [x] 2.2 Add "Import Showdown" button to the Attacker and Defender panels in `src/features/calculator/`.

## 3. Integration & State Management

- [x] 3.1 Implement the batch update logic to apply parsed data to the component state.
- [x] 3.2 Ensure species selection correctly resolves and populates base stats and types.
- [x] 3.3 Verify that importing a set triggers a damage recalculation.

## 4. Final Polish

- [x] 4.1 Add basic error handling/validation for invalid export strings.
- [x] 4.2 Verify layout and responsiveness of the new import UI.
