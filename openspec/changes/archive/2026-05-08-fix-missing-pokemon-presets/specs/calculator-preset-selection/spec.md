## ADDED Requirements

### Requirement: Preset Application
The system SHALL apply the selected preset to the Pokémon's configuration state in the damage calculator.

#### Scenario: Applying a valid preset
- **WHEN** a user selects a preset from the preset list
- **THEN** the system SHALL update the Pokémon's EVs, IVs, Nature, Hold Item, Ability, and Moves to match the preset's defined values.
- **AND** the UI SHALL clearly indicate that a preset has been applied.

#### Scenario: Partial preset data
- **WHEN** a preset is applied that lacks certain data (e.g., fewer than 4 moves)
- **THEN** the missing fields SHALL be cleared or set to their default values (e.g., empty move slots) while the provided fields are correctly populated.
