## Why

Currently, the Speed Tier List requires calculating benchmarks on the fly. To improve performance and ensure data consistency, we need to pre-calculate these speed benchmarks for Regulation M-A Pokémon and store them directly in the database.

## What Changes

- **New Table**: Create a `calculated_speeds` table in the database schema.
- **Seeding Script**: Add a script `scripts/seed-calculated-speeds.ts` to calculate benchmarks for legal Regulation M-A Pokémon and populate the new table.
- **Migration**: Generate and apply the database migration for the new table.

## Capabilities

### New Capabilities
- `precalculated-speed-benchmarks`: Database-level storage of computed speed benchmarks for competitive play.

### Modified Capabilities
- `vgc-data-schema`: Update the database schema to include the new `calculated_speeds` table.

## Impact

- `src/db/schema.ts`: Addition of the `calculated_speeds` table.
- `scripts/seed-calculated-speeds.ts`: New utility script for data population.
- Database: New table and pre-filled speed data for Regulation M-A.
