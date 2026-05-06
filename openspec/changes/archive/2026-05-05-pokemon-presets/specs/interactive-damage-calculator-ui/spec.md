## ADDED Requirements

### Requirement: Preset Selection UI
The UI SHALL provide a selection mechanism to choose a predefined Pokemon set for both the Attacker and the Defender.

#### Scenario: Selecting a preset
- **WHEN** the user selects a preset from the dropdown
- **THEN** the system SHALL immediately update the Pokemon's form fields (Species, Nature, EVs, Item, Ability, Moves) to match the selected preset.

#### Scenario: Reactive recalculation on preset change
- **WHEN** the user selects a preset
- **THEN** all damage results at the top of the dashboard SHALL recalculate immediately to reflect the new Pokemon configuration.