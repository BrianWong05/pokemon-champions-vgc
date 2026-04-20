## ADDED Requirements

### Requirement: Ability Schema Tables
The database SHALL include tables for storing Pokémon abilities and their relationships to Pokémon.
- `abilities` table: `id` (integer, PK), `identifier` (text), `name_en` (text), `name_ja` (text), `name_zh` (text).
- `pokemon_abilities` junction table: `pokemon_id` (integer, FK), `ability_id` (integer, FK), `is_hidden` (boolean), `slot` (integer).

#### Scenario: Schema validation
- **WHEN** the Drizzle migrations are run
- **THEN** the `abilities` and `pokemon_abilities` tables SHALL exist in the SQLite database with the specified columns.
