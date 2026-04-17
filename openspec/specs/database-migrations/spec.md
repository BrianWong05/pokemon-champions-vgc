## ADDED Requirements

### Requirement: Migration file generation
The system SHALL generate raw SQL migration files that correspond to the TypeScript schema definitions.

#### Scenario: Running drizzle-kit generate
- **WHEN** the `drizzle-kit generate` command is run
- **THEN** a new SQL file containing the `CREATE TABLE` statements for the schema SHALL be created.

### Requirement: Foreign key enforcement
The generated SQL migration MUST include proper foreign key constraints, particularly for the `pokemon_moves` junction table.

#### Scenario: Enforcing move-to-pokemon relationship
- **WHEN** a record in `pokemon_moves` is created
- **THEN** the `pokemon_id` and `move_id` MUST correspond to existing records in the `pokemon` and `moves` tables respectively.

### Requirement: SQLite compatibility
The generated SQL migration MUST be compatible with SQLite's SQL syntax and data types.

#### Scenario: Executing migration
- **WHEN** the SQL migration is executed against a SQLite database
- **THEN** all tables, columns, and constraints SHALL be created without error.
