## ADDED Requirements

### Requirement: Field Gravity Toggle
The system SHALL provide a UI toggle to activate/deactivate the Gravity field condition.

#### Scenario: Toggling Gravity
- **WHEN** the user clicks the "Gravity" button in the field options
- **THEN** the system SHALL update the state to reflect `isGravity: true` (or toggle its current value) and trigger a recalculation.
