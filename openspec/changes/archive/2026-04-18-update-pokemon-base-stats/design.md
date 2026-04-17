## Context

The `pokemon` table currently lacks explicit base stat column names and the data itself is not populated. We need to update the schema and provide a seeding script that uses PokeAPI to update existing records with the correct base stats.

## Goals / Non-Goals

**Goals:**
- Update the `pokemon` table schema with explicit `baseHp`, `baseAttack`, `baseDefense`, `baseSpAtk`, `baseSpDef`, and `baseSpeed` columns.
- Implement an automated seeding script `scripts/seed-stats.ts`.
- Fetch data from PokeAPI with rate-limiting.
- Successfully update existing database records based on Pokémon identifier or ID.

**Non-Goals:**
- Populating stats for non-Pokémon entities (like items or moves).
- Real-time data updates (this is a one-time seeding operation or periodic refresh).

## Decisions

- **Column Renaming/Addition**: The existing `hp`, `atk`, `def`, `spa`, `spd`, and `spe` columns will be replaced/supplemented by `baseHp`, `baseAttack`, `baseDefense`, `baseSpAtk`, `baseSpDef`, and `baseSpeed` to be more explicit.
- **Seeding Source**: The project's existing `scripts/extract_pokeapi_data.py` will be updated to fetch and populate these columns directly into the SQLite database.
- **Drizzle Usage**: The schema updates will be managed via Drizzle migration files and the `drizzle-kit` toolset.

## Risks / Trade-offs

- **[Risk]** Breaking Changes in PokeAPI → **[Mitigation]** The PokeAPI schema is stable, but we will wrap the logic in a try/catch block and log errors.
- **[Risk]** Slow Seeding Process (1500+ Pokémon) → **[Mitigation]** The 50ms delay is necessary for stability; we will log progress for each record to keep the developer informed.
- **[Risk]** Data Integrity (matching identifiers) → **[Mitigation]** We will use either `id` or `identifier` (name) for matching records between PokeAPI and the local database.
