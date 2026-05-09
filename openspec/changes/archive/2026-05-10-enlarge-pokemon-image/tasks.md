## 1. UI Refactoring

- [x] 1.1 Update `PokemonImage.tsx` default size to `w-16 h-16`
- [x] 1.2 Audit usage of `PokemonImage` across the app to ensure larger size doesn't break layout
- [x] 1.3 Manually override sizes in components that require the previous smaller size (e.g., small lists)

## 2. Verification

- [x] 2.1 Verify Pokémon image in Speed Tier List grid is appropriately sized
- [x] 2.2 Verify Pokémon image in Detail Modal is large and clear
- [x] 2.3 Check for any layout regressions caused by larger image sizes
