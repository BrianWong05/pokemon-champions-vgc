## ADDED Requirements

### Requirement: Relative Visual HP Bar
The system SHALL update the visual HP bar in the dashboard to represent damage relative to the Pokémon's current HP.

#### Scenario: Visual damage indication
- **WHEN** the Defender's current HP is 50%
- **THEN** the visual HP bar SHALL start at the 50% mark
- **AND** subtracted damage SHALL animate from that starting point.
