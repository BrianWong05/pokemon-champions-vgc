## ADDED Requirements

### Requirement: Stat Reset Action
The system SHALL provide a mechanism to reset all Pokémon Special Points (SP) and Effort Values (EV) to zero in a single action.

#### Scenario: Successful stat reset
- **WHEN** the user clicks the "Reset Stats" button
- **THEN** the system MUST set `spHp`, `spAtk`, `spDef`, `spSpa`, `spSpd`, and `spSpe` to `0` in the current configuration.
