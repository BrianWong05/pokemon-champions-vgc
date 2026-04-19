## ADDED Requirements

### Requirement: Searchable Pokémon Filter
The system SHALL provide a search field that filters the list of available Pokémon based on English or Chinese names.

#### Scenario: Filtering by name
- **WHEN** the user types "Flutter" into the search field
- **THEN** only Pokémon with "Flutter" in their name (e.g., Flutter Mane) SHALL be displayed in the dropdown.

### Requirement: Auto-populate Base Stats
The system SHALL automatically update the base stat fields for the respective side (Attacker or Defender) when a Pokémon is selected.

#### Scenario: Selecting a Pokémon
- **WHEN** the user selects "Incineroar" from the dropdown
- **THEN** the base HP, Atk, Def, SpA, SpD, and Spe inputs SHALL be updated with Incineroar's database values.
