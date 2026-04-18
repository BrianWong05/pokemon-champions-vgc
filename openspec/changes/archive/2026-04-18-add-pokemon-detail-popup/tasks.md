## 1. Setup & State

- [x] 1.1 Add `selectedPokemonId` state to `SpeedTierPage` in `src/pages/SpeedTierList/index.tsx`.
- [x] 1.2 Implement a click handler on `StatGridItem` to update the selected ID.

## 2. Component Development

- [x] 2.1 Create `src/components/atoms/StatBar.tsx` for visual stat display.
- [x] 2.2 Create `src/components/molecules/FormItem.tsx` to list alternate forms.
- [x] 2.3 Create `src/components/organisms/PokemonDetailModal.tsx` and its UI structure.

## 3. Data Fetching

- [x] 3.1 Implement a query in `getDb` context to fetch full stats and related forms for a given ID.
- [x] 3.2 Ensure the form query correctly handles regional variants and Mega evolutions.

## 4. Integration & Verification

- [x] 4.1 Integrate the modal into `SpeedTierPage`.
- [x] 4.2 Verify the modal displays correct information when clicking various Pokémon.
- [x] 4.3 Verify form switching logic within the modal.
