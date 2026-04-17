## ADDED Requirements

### Requirement: Pokémon relationship with battle formats
The system SHALL support relationships between Pokémon records and the `format_pokemon` table to enable legality queries.

#### Scenario: Querying Pokémon legality
- **WHEN** a user queries for all legal Pokémon in the "Regulation M-A" format
- **THEN** the system SHALL return records based on entries in the `format_pokemon` junction table.
