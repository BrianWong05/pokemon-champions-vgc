## MODIFIED Requirements

### Requirement: Fetch Pokémon by Format
The system SHALL retrieve all Pokémon that are legal for a specified format name (e.g., 'Regulation M-A') from the database, ensuring that only officially authorized forms are included.

#### Scenario: Successful fetch for Regulation M-A
- **WHEN** the `fetchRegulationMAPokemonSpeed` function is called
- **THEN** the system executes a Drizzle ORM query joining `pokemon`, `format_pokemon`, and `formats` where `formats.name` equals 'Regulation M-A'.
- **AND** the resulting list SHALL NOT contain any restricted Mega Z or Mega Raichu variants.
