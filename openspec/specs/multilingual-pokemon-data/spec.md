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

### Requirement: Localized form names
The system SHALL construct localized names for alternate Pokémon forms by applying form-specific prefixes or suffixes to the base species' localized name.

#### Scenario: Constructing Mega form name
- **WHEN** processing an identifier with a `-mega` suffix
- **THEN** the English name SHALL be "Mega " prepended to the base name, and the Japanese name SHALL be "メガ" prepended to the base name.

#### Scenario: Constructing Regional form name
- **WHEN** processing an identifier with an `-alola` suffix
- **THEN** the English name SHALL be "Alolan " prepended to the base name, and the Chinese name SHALL be "阿羅拉的樣子 " prepended to the base name.

#### Scenario: Unrecognized form fallback
- **WHEN** processing an alternate form identifier with an unrecognized suffix
- **THEN** the system SHALL fall back to using the base species' localized name.
