## Context

The Pokémon VGC application requires a structured, type-safe database for managing game data. SQLite is chosen for its local, file-based storage simplicity, and Drizzle ORM for its lightweight, TypeScript-first approach. This design details the schema structure and the migration workflow.

## Goals / Non-Goals

**Goals:**
- Implement the core database schema (`pokemon`, `moves`, `abilities`, `pokemon_moves`).
- Ensure all Pokémon stats are stored as integers.
- Establish a one-way, TypeScript-to-SQL migration path using Drizzle Kit.
- Enforce foreign key constraints within the SQLite database.

**Non-Goals:**
- Populating the database with complete VGC data (focus is on schema setup).
- Implementing the application's data-access layer (DAO).
- Migrating data between different database engines (e.g., SQLite to Postgres).

## Decisions

- **Decision**: Use `integer` for all Pokémon stats (HP, Atk, Def, Spa, Spd, Spe).
  - **Rationale**: Stats are always discrete whole numbers in VGC, making integer storage the most efficient and correct representation.
  - **Alternatives**: Numeric/Float (adds unnecessary complexity).
- **Decision**: Define the schema using the `export const table = sqliteTable(...)` syntax in `schema.ts`.
  - **Rationale**: This is the standard, modular Drizzle syntax that enables both type safety in queries and migration generation.
  - **Alternatives**: Manually writing SQL first and generating types (less TypeScript-native).
- **Decision**: Use `drizzle-kit` for SQL migration file generation.
  - **Rationale**: Automates the creation of `CREATE TABLE` statements and ensures they remain in sync with the TypeScript schema.
  - **Alternatives**: Manual SQL migration authoring (error-prone).

## Risks / Trade-offs

- [Risk] **Schema Drift** → **Mitigation**: Use `drizzle-kit push` for development and versioned migrations for production.
- [Risk] **SQLite Constraint Support** → **Mitigation**: Ensure all constraints (like Foreign Keys and Check constraints) are explicitly defined in the Drizzle schema.
- [Risk] **TypeScript Type Synchronization** → **Mitigation**: Rely on Drizzle's `inferSelect` and `inferInsert` for direct application types.
