## MODIFIED Requirements

### Requirement: Pokémon stats storage
The system SHALL store Pokémon base stats (HP, Attack, Defense, Special Attack, Special Defense, Speed) as integers.

#### Scenario: Validating base stats
- **WHEN** a Pokémon is added to the database with a base HP of 100
- **THEN** the value SHALL be stored accurately as an integer.

## ADDED Requirements

### Requirement: Pokémon localized names
The system SHALL store Pokémon names in English, Japanese, and Traditional Chinese.

#### Scenario: Querying localized names
- **WHEN** a Pokémon record is retrieved
- **THEN** the system SHALL provide `name_en`, `name_ja`, and `name_zh` fields.

### Requirement: Pokémon forms and types metadata
The system SHALL maintain dedicated tables for Pokémon forms and type definitions to support extended VGC data.

#### Scenario: Accessing form data
- **WHEN** a user queries for Pokémon form variations
- **THEN** the system SHALL provide data from the `pokemon_forms` table.

### Requirement: Pokémon relationship with battle formats
The system SHALL support relationships between Pokémon records and the `format_pokemon` table to enable legality queries.

#### Scenario: Querying Pokémon legality
- **WHEN** a user queries for all legal Pokémon in the "Regulation M-A" format
- **THEN** the system SHALL return records based on entries in the `format_pokemon` junction table.
