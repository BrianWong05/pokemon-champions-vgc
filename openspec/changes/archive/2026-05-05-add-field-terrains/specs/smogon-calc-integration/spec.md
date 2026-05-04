## ADDED Requirements

### Requirement: Field Terrain Mapping to Smogon Calc
The system SHALL map the `terrain` state variable to the `terrain` property in the `@smogon/calc` `Field` object.

#### Scenario: Passing terrain to Smogon Field
- **WHEN** the application state has `terrain: 'Electric'`
- **THEN** the `Field` object passed to Smogon's `calculate` function SHALL have `terrain: 'Electric'`.
