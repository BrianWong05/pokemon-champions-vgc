## Context

The current database stores Pokémon attributes, moves, and forms, but does not have a mechanism to track which Pokémon are legal in specific VGC regulations (formats). We need to add tables to store format definitions and a junction table to link Pokémon to these formats.

## Goals / Non-Goals

**Goals:**
- Define a `formats` table for storing battle regulation metadata.
- Define a `format_pokemon` junction table for Pokémon legality mappings.
- Use Drizzle ORM to define the schema.
- Generate manual SQLite migration scripts for table creation.
- Ensure data integrity with foreign key constraints and composite primary keys.

**Non-Goals:**
- Implementing a UI for managing formats.
- Populating the tables with data (this will be handled by a separate process/script).

## Decisions

- **Table: `formats`**:
  - `id`: `integer` primary key.
  - `name`: `text` NOT NULL (e.g., 'Regulation M-A').
  - `description`: `text` (nullable).
  - `isActive`: `integer` (boolean mode) default true.
- **Table: `format_pokemon`**:
  - `formatId`: `integer` references `formats.id` with `onDelete: 'cascade'`.
  - `pokemonId`: `integer` references `pokemon.id` with `onDelete: 'cascade'`.
  - **Primary Key**: Composite key on `(formatId, pokemonId)`.
- **Drizzle relations**: Add relations to `pokemon` and the new tables to simplify querying.

## Risks / Trade-offs

- **[Risk]** Large volume of legality records. → **[Mitigation]** Use composite primary keys and appropriate indexing for efficient lookups.
- **[Risk]** Schema mismatch between Drizzle and manual SQL. → **[Mitigation]** Carefully verify the manual CREATE TABLE statements against the Drizzle schema definitions.
