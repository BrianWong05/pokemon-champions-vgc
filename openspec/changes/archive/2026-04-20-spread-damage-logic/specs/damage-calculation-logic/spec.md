## ADDED Requirements

### Requirement: Spread Modifier Pipeline Integration
The system SHALL integrate the spread damage modifier (0.75x) into the calculation pipeline immediately after Base Damage calculation and before weather/STAB.

#### Scenario: Multi-modifier calculation
- **WHEN** calculating damage for a move
- **THEN** the system SHALL multiply the base damage by 0.75 if `isSpreadTarget` is true.
