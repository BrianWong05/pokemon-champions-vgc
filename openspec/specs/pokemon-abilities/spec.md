## Purpose
TBD: Definition and management of ability data and Pokémon-ability relationships.

## ADDED Requirements

### Requirement: Ability Data Extraction
The system SHALL provide a mechanism to download and merge ability data from PokeAPI CSV sources.
- Languages: English (9), Japanese (11), Traditional Chinese (4).
- Sources: `abilities.csv`, `ability_names.csv`, `pokemon_abilities.csv`.

#### Scenario: Merging multilingual names
- **WHEN** the extraction script runs
- **THEN** it SHALL produce a dataset with ability IDs, identifiers, and names in English, Japanese, and Traditional Chinese.

### Requirement: Pokémon-Ability Relationship Seeding
The system SHALL associate abilities with existing Pokémon in the `vgc_pokemon.db`.
- Filter for existing Pokémon IDs in the database.
- Use `is_hidden` and `slot` from `pokemon_abilities.csv`.

#### Scenario: Seeding junction table
- **WHEN** the seeding script runs
- **THEN** the `pokemon_abilities` table SHALL be populated with associations for all tracked Pokémon.
