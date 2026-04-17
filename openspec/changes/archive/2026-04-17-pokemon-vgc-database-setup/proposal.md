## Why

The project requires a structured database to store and manage Pokémon VGC data, including Pokémon stats, moves, and abilities. Implementing a Drizzle ORM-managed SQLite database will provide type-safe data access, clear relationships between entities, and a streamlined migration process for the VGC application.

## What Changes

- **Database Engine**: Set up SQLite for local data storage.
- **ORM Integration**: Implement Drizzle ORM for TypeScript-first database management.
- **Schema Implementation**: Create tables for `pokemon`, `moves`, `abilities`, and a `pokemon_moves` junction table.
- **Data Integrity**: Ensure stats are integers and types are strings (with appropriate validation).
- **Migration System**: Establish a process for generating and applying SQL migrations.

## Capabilities

### New Capabilities
- `vgc-data-schema`: Detailed schema for Pokémon, moves, and abilities.
- `database-migrations`: System for managing SQLite database versions via SQL files.

### Modified Capabilities
<!-- No existing capabilities to modify. -->

## Impact

- **Dependencies**: Addition of `drizzle-orm`, `drizzle-kit`, and `better-sqlite3` (or equivalent).
- **Project Structure**: New directory for database schema and migrations.
- **Data Access**: Application logic will interact with the database using Drizzle queries.
