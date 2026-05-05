## 1. UI Component Updates

- [x] 1.1 Update `src/components/molecules/MoveSearchSelect.tsx` to display `m.nameZh` next to or below `m.nameEn` in the dropdown list.
- [x] 1.2 Update `src/components/organisms/PokemonPanel.tsx` to display `move.nameZh` in the selected move slot.
- [x] 1.3 Update `src/components/organisms/ResultsPanel.tsx` to include `moveNameZh` in the `DamageResult` interface and display it in the damage assessment rows.

## 2. Data Plumbing

- [x] 2.1 Update the `DamageResult` interface in `src/utils/damage.ts` to include `moveNameZh: string | null`.
- [x] 2.2 Update the `computeResults` function in `src/pages/DamageCalculator/index.tsx` to extract `nameZh` from the `MoveData` and include it in the returned `DamageResult` objects.

## 3. Verification

- [x] 3.1 Verify that searching for a move using Chinese characters works and displays both languages in the list.
- [x] 3.2 Verify that selecting a move displays the Chinese name in the move pool selection area.
- [x] 3.3 Verify that the Chinese name appears in the results panel damage list.
