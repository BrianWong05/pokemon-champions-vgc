## MODIFIED Requirements

### Requirement: Language Filtering
The system SHALL filter names from `pokemon_species_names.csv` based on specific language IDs.

#### Scenario: Extracting Japanese names
- **WHEN** processing `pokemon_species_names.csv` with `local_language_id` 1 (ja-Hrkt)
- **THEN** it SHALL extract the corresponding Japanese name.

### Requirement: Chinese Localization
The system SHALL prioritize Traditional Chinese (zh-Hant) for Chinese localized names.

#### Scenario: Extracting zh-Hant names
- **WHEN** processing names with `local_language_id` 4 (zh-Hant)
- **THEN** it SHALL extract the Traditional Chinese name.

## ADDED Requirements

### Requirement: Localized name availability
The system SHALL make localized Pokémon names (`name_en`, `name_ja`, `name_zh`) available through the Drizzle ORM layer.

#### Scenario: Querying with Drizzle
- **WHEN** using Drizzle ORM to select Pokémon records
- **THEN** the `name_en`, `name_ja`, and `name_zh` fields SHALL be accessible in the result set.
