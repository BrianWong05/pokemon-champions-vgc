## Why

Previously, the Speed Tier List component calculated speed benchmarks on the frontend. To improve architectural efficiency and ensure data consistency, we have moved these calculations to the database. We now need to refactor the component to fetch this pre-calculated data directly from the `calculated_speeds` table.

## What Changes

- Refactor `SpeedTierList.tsx` to use Drizzle ORM for data fetching.
- Replace frontend stat calculation logic with a direct database query joining `pokemon` and `calculated_speeds`.
- Update TypeScript interfaces to match the direct database response structure.
- Add a loading state for the data fetching process.

## Capabilities

### New Capabilities
- `speed-tier-data-access`: Logic for querying pre-calculated speed data for specific formats.

### Modified Capabilities
- `speed-tier-list`: Refactor the display logic to use pre-calculated database values instead of on-the-fly calculations.

## Impact

- `src/pages/SpeedTierList/index.tsx`: Component refactored.
- `src/db/`: Used for Drizzle queries.
- User Experience: Faster page load (less client-side computation) and consistent data.
