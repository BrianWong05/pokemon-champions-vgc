## ADDED Requirements

### Requirement: Comprehensive Multi-strike Registry
The system SHALL maintain a registry of all multi-strike moves including their minimum and maximum hit counts.

#### Scenario: Register fixed hit move
- **WHEN** move "Dragon Darts" is checked
- **THEN** system identifies it as a multi-strike move
- **AND** returns min: 2, max: 2

#### Scenario: Register variable hit move
- **WHEN** move "Bullet Seed" is checked
- **THEN** system identifies it as a multi-strike move
- **AND** returns min: 2, max: 5

#### Scenario: Register high-hit move
- **WHEN** move "Population Bomb" is checked
- **THEN** system identifies it as a multi-strike move
- **AND** returns min: 1, max: 10

### Requirement: Enforce Hit Limits in UI
The Damage Calculator SHALL restrict the hit count input range based on the selected move's metadata.

#### Scenario: Update UI limits
- **WHEN** user selects "Scale Shot" as a move
- **THEN** the "Hits" input in the UI has min="2" and max="5"
- **AND** the current value is clamped within this range
