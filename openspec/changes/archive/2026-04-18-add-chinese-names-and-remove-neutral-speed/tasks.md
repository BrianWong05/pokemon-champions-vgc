## 1. Data & Interface Updates

- [x] 1.1 Update the `PokemonWithSpeeds` interface in `src/pages/SpeedTierList/index.tsx` and `src/components/organisms/TierSection.tsx` to include `nameZh: string | null`.
- [x] 1.2 Update the Drizzle query in `src/pages/SpeedTierList/index.tsx` to select `nameZh: pokemon.nameZh`.

## 2. Component Refactoring

- [x] 2.1 Update `StatGridItemProps` to include `nameZh: string | null`.
- [x] 2.2 Refactor `src/components/molecules/StatGridItem.tsx` to render the `nameZh` below the English name.
- [x] 2.3 Ensure `TierSection.tsx` correctly passes the `nameZh` prop.
- [x] 2.4 Remove the "Neutral" (uninvested) speed column from `StatGridItem.tsx` and `TierSection.tsx`.

## 3. Verification

- [x] 3.1 Run `npm run type-check` to ensure no interface errors.
- [x] 3.2 Verify the UI displays English/Chinese names and the 3-column benchmark grid (Max+, Max, Min-) correctly.
