## ADDED Requirements

### Requirement: Field Terrain Toggles
The system SHALL provide UI controls to select the active field terrain (Electric, Grassy, Misty, Psychic, None).

#### Scenario: Selecting Electric Terrain
- **WHEN** the user clicks the "Electric" terrain button
- **THEN** the system SHALL update the state to reflect `terrain: 'Electric'` and trigger a recalculation.
