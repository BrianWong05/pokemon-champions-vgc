## Context

The current `SpeedTierList.tsx` implementation relies on mock data and local calculation of speed stats. With the addition of the `calculated_speeds` table, we can now offload this calculation to the database and fetch accurate, pre-computed values for Regulation M-A Pokémon.

## Goals / Non-Goals

**Goals:**
- Replace mock data with real database records.
- Eliminate frontend stat calculations.
- Maintain the grouped "tier" UI layout.
- Use Drizzle ORM for type-safe data fetching.

**Non-Goals:**
- Modifying the database schema (already handled in a previous change).
- Adding new UI features beyond the refactor.

## Decisions

- **Data Fetching**: The component will use `useEffect` to trigger an async Drizzle query. This query will join `pokemon`, `format_pokemon`, `formats`, and `calculated_speeds`.
- **Filtering**: We will strictly filter for `formats.name = 'Regulation M-A'`.
- **State Management**: We will store the flat results in a `useState` array and use `useMemo` to group them by `baseSpeed` for the tier view. This preserves the "grouping" logic while using database source data.
- **Loading UI**: A simple loading indicator will be shown while the database query is in flight.

## Risks / Trade-offs

- **[Risk]** Large data set causing slow render → **[Mitigation]** Regulation M-A has a manageable number of legal Pokémon (~245). Client-side grouping using `useMemo` should remain efficient.
- **[Risk]** Broken image paths → **[Mitigation]** The `onError` handler on images will remain to provide fallback sprites.
