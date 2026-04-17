## Why

The current `pokemon` table schema uses short stat names (`hp`, `atk`, etc.) that may conflict with other data or be less descriptive. Furthermore, the base stats themselves are missing from the populated database records. This change aims to standardize the schema with more explicit base stat column names and provide an automated way to populate them from PokeAPI.

## What Changes

- **BREAKING**: Modify the `pokemon` table in `src/db/schema.ts` to include/rename stats to `baseHp`, `baseAttack`, `baseDefense`, `baseSpAtk`, `baseSpDef`, and `baseSpeed`.
- Provide migration steps using `drizzle-kit`.
- Update `scripts/extract_pokeapi_data.py` to correctly populate the new columns during database extraction.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `vgc-data-schema`: Update requirement for Pokémon stats storage to use explicit `baseHp`, `baseAttack`, `baseDefense`, `baseSpAtk`, `baseSpDef`, and `baseSpeed` columns.

## Impact

- `src/db/schema.ts`: Modified `pokemon` table definition.
- `scripts/seed-stats.ts`: New seeding script.
- Database: Schema migration and data updates.
