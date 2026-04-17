## ADDED Requirements

### Requirement: Pokémon stats storage
The system SHALL store Pokémon base stats (HP, Attack, Defense, Special Attack, Special Defense, Speed) as integers.

#### Scenario: Validating base stats
- **WHEN** a Pokémon is added to the database with a base HP of 100
- **THEN** the value SHALL be stored accurately as an integer.

### Requirement: Pokémon type validation
The system SHALL store Pokémon types as strings and MUST support the 18 official Pokémon types (Normal, Fire, Water, etc.).

#### Scenario: Assigning types
- **WHEN** a Pokémon is assigned 'Fire' and 'Flying' types
- **THEN** both SHALL be stored correctly as strings.

### Requirement: Junction table for moves
The system SHALL use a `pokemon_moves` junction table to manage the many-to-many relationship between Pokémon and moves.

#### Scenario: Learning a move
- **WHEN** a Pokémon learns a specific move
- **THEN** an entry SHALL be created in the `pokemon_moves` table linking the Pokémon ID and the Move ID.

### Requirement: Ability descriptions
The system SHALL store ability names and their full textual descriptions.

#### Scenario: Querying an ability
- **WHEN** an ability is queried by name
- **THEN** the system SHALL return the associated textual description.
