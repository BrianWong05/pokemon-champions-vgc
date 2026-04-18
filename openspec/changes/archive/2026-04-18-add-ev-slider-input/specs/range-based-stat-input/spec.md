## ADDED Requirements

### Requirement: Range-based Stat Adjustment
The system SHALL provide a slider (range input) for each stat in the EV converter to allow for tactile value adjustments.

#### Scenario: Dragging the slider
- **WHEN** the user drags the HP stat slider to a new position
- **THEN** the numeric HP EV input SHALL update to reflect the slider's value in real-time.

### Requirement: Constraint Enforcement on Range Input
The slider input SHALL respect the minimum and maximum EV limits.

#### Scenario: Slider boundaries
- **WHEN** the user attempts to drag the slider
- **THEN** the value SHALL be constrained between 0 and 252.
