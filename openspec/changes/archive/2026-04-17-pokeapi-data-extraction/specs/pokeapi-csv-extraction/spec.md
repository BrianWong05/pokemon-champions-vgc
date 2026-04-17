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
