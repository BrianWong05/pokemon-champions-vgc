## Why

To support the Regulation M-A speed tier component, we need a reliable data-fetching utility that retrieves legal Pokémon from the database, applies custom "SP" stat formulas, and returns a sorted data structure for the frontend.

## What Changes

- Implement a Drizzle ORM query to fetch Pokémon legal in the "Regulation M-A" format.
- Integrate custom speed benchmark calculations into the data-fetching layer.
- Ensure the returned data is sorted by Base Speed in descending order.

## Capabilities

### New Capabilities
- `regulation-m-a-data-fetching`: Logic to query and process legal Pokémon for Regulation M-A.

### Modified Capabilities
- None

## Impact

- `src/services/pokemon.ts`: New service for fetching Pokémon data.
- `src/db/`: Potential updates to include joins for format legality.
