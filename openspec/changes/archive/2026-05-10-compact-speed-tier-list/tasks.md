## 1. UI Refactoring

- [x] 1.1 Refactor `StatGridItem.tsx` into a compact card component
- [x] 1.2 Update `TierSection.tsx` to use a responsive grid layout instead of a table-like list
- [x] 1.3 Remove redundant column headers from `TierSection.tsx`
- [x] 1.4 Adjust typography and spacing for high-density information display

## 2. Layout Optimization

- [x] 2.1 Implement responsive grid columns (1 on mobile, 2 on md, 3 on lg, 4 on xl)
- [x] 2.2 Add subtle borders or backgrounds to separate Pokémon cards in the grid
- [x] 2.3 Ensure truncation logic prevents long names from breaking the grid layout

## 3. Verification

- [x] 3.1 Verify compact layout on desktop (multiple columns per tier)
- [x] 3.2 Verify responsive behavior on mobile (single column, cards remain readable)
- [x] 3.3 Ensure click functionality to open `PokemonDetailModal` is preserved
