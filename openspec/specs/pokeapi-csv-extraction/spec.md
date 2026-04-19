## ADDED Requirements

### Requirement: CSV Fetching
The system SHALL fetch raw CSV files directly from the PokeAPI GitHub repository.

#### Scenario: Fetching pokemon.csv
- **WHEN** the script executes
- **THEN** it SHALL download the `pokemon.csv` file from the official PokeAPI master branch.

### Requirement: Data Merging
The system SHALL merge multiple CSV files using relational IDs (e.g., `pokemon_id`, `species_id`).

#### Scenario: Merging species and names
- **WHEN** processing `pokemon_species.csv` and `pokemon_species_names.csv`
- **THEN** it SHALL join them to obtain the localized names for each Pokémon.

### Requirement: Stat Pivoting
The system SHALL pivot stat data from a long format to a wide format for the database.

#### Scenario: Pivoting HP stat
- **WHEN** reading `pokemon_stats.csv`
- **THEN** the HP stat value for a Pokémon SHALL be stored in its own column in the final table.
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
