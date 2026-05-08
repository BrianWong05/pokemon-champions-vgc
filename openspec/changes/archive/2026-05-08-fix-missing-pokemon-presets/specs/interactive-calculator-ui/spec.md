## ADDED Requirements

### Requirement: Preset Selection Interface
The calculator UI SHALL include a mechanism to view and select available presets for the currently selected Pokémon.

#### Scenario: Displaying available presets
- **WHEN** a Pokémon is selected in the calculator and it has available presets
- **THEN** the UI SHALL provide a way to open a list of those presets.

#### Scenario: Handling no presets
- **WHEN** a Pokémon is selected in the calculator but has no available presets
- **THEN** the preset selection mechanism SHALL indicate that no presets are available or be disabled.
