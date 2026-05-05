## ADDED Requirements

### Requirement: Multi-hit Selection UI
The system SHALL provide a numeric selector for moves that hit multiple times.

#### Scenario: Multi-hit move selected
- **WHEN** a move with a `multihit` property (e.g., Bullet Seed) is selected
- **THEN** a "Hits" input SHALL appear next to the move details.

#### Scenario: Single-hit move selected
- **WHEN** a move without a `multihit` property (e.g., Thunderbolt) is selected
- **THEN** the "Hits" input SHALL NOT be visible.

### Requirement: Damage Multiplier Application
The system SHALL apply the selected hit count to the damage calculation.

#### Scenario: Calculating multi-hit damage
- **WHEN** the user sets "Hits" to 5 for Bullet Seed
- **THEN** the damage result SHALL reflect the total damage for 5 hits.
