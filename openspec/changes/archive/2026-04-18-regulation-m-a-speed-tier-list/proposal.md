## Why

The Pokémon Champions VGC website uses a custom "SP" system for stats instead of the traditional EV/IV system. Competitive players need a specialized Speed Tier List for the "Regulation M-A" format that accurately calculates and displays actual speed stats across key benchmarks (Max+, Max, Neutral, and Min-) using the custom formula.

## What Changes

- Implement a custom speed stat calculation utility based on the Pokémon Champions formula.
- Create a new Speed Tier List page that groups Regulation M-A Pokémon by their Base Speed.
- Display a responsive UI with Pokémon thumbnails and a 4-column benchmark grid.
- Integrate the new page into the application routing.

## Capabilities

### New Capabilities
- `speed-tier-list`: A feature to display organized speed benchmarks for competitive Pokémon in specific formats.
- `stat-calculation-utils`: A set of utilities for computing Pokémon stats using the custom "SP" and Nature formulas.

### Modified Capabilities
- None

## Impact

- `src/pages/SpeedTierList/`: New directory for the page component.
- `src/utils/stats.ts`: New utility file for stat calculations.
- `src/App.tsx`: Updated to include routing for the new page.
- `src/db/schema.ts`: Potential reference for Pokémon data structure.
