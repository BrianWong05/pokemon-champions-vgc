## Context

The Drizzle ORM schema must be updated to align with the database structure created by the Python data extraction script. This ensures type-safe access to localized names, Pokémon forms, and type data.

## Goals / Non-Goals

**Goals:**
- Update `src/db/schema.ts` to include `name_en`, `name_ja`, `name_zh` in the `pokemon` table.
- Add `pokemon_forms` and `types` tables to the Drizzle schema.
- Generate a migration that matches the existing database state.

**Non-Goals:**
- Modifying the Python extraction script.
- Populating additional data manually.

## Decisions

- **Decision**: Match Drizzle table and column names exactly with the Python script's output.
  - **Rationale**: Ensures that Drizzle can correctly map to the existing tables in `vgc_pokemon.db` without renaming them.
- **Decision**: Use `drizzle-kit generate` to create the migration file.
  - **Rationale**: Captures the delta between the old and new schema as a standard migration.

## Risks / Trade-offs

- [Risk] **Migration Conflict** → **Mitigation**: Since we already pushed changes manually with the Python script, we might need to use `drizzle-kit push` or manually resolve the migration if it tries to recreate existing tables.
- [Risk] **Data Type Mismatch** → **Mitigation**: Carefully verify that Drizzle types (e.g., `text`, `integer`) match those used in the Python script.
