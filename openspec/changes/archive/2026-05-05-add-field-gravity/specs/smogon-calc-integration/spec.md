## ADDED Requirements

### Requirement: Field Gravity Mapping to Smogon Calc
The system SHALL map the `isGravity` state variable to the `isGravity` property in the `@smogon/calc` `Field` object.

#### Scenario: Passing gravity to Smogon Field
- **WHEN** the application state has `isGravity: true`
- **THEN** the `Field` object passed to Smogon's `calculate` function SHALL have `isGravity: true`.
