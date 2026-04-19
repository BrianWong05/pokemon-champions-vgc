## ADDED Requirements

### Requirement: Move Data Extraction
The system SHALL fetch and process move-related data from PokeAPI CSVs.

#### Scenario: Extracting localized move names
- **WHEN** the script processes `move_names.csv`
- **THEN** it SHALL extract names for languages 9 (En), 1 (Ja), and 4 (Zh) for every move ID.

### Requirement: Pokémon Move-set Optimization
The system SHALL filter the Pokémon move-sets to include only specific learn methods.

#### Scenario: VGC Move filtering
- **WHEN** reading `pokemon_moves.csv`
- **THEN** it SHALL only include moves learned via "level-up", "machine", or "tutor" methods.
