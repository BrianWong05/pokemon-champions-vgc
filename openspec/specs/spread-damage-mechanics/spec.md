## ADDED Requirements

### Requirement: Spread Damage Toggle
The system SHALL provide a UI mechanism to toggle between "Single Target" and "Spread Target" damage modes.

#### Scenario: Toggling mode
- **WHEN** the user selects "Spread Target"
- **THEN** the system SHALL apply a 0.75x multiplier to the damage of moves that hit multiple targets.

### Requirement: Spread Damage Multiplier
The system SHALL apply a 0.75x multiplier to the damage calculation when the "Spread Target" mode is active.

#### Scenario: Calculating damage for Rock Slide
- **WHEN** the Attacker uses "Rock Slide" and "Spread Target" is active
- **THEN** the system SHALL reduce the calculated damage by 25%.
