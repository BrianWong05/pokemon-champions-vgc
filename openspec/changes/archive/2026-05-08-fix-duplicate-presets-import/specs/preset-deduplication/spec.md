## ADDED Requirements

### Requirement: Preset Uniqueness Check
The `scripts/add_showdown_preset.mjs` script SHALL verify that a preset does not already exist in the database before attempting to insert it.

#### Scenario: Importing an existing preset
- **WHEN** the script processes a preset that has the same Pokémon, nature, ability, item, and move set as an existing entry
- **THEN** the script SHALL skip the insertion and report that a duplicate was found.

#### Scenario: Importing a new unique preset
- **WHEN** the script processes a preset that has a unique configuration
- **THEN** the script SHALL proceed with the insertion into the database.
