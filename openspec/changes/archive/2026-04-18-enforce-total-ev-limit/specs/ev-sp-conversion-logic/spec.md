## MODIFIED Requirements

### Requirement: Total Constraint Validation
The system SHALL enforce a total limit of 510 EVs across all 6 stats and provide visual feedback.

#### Scenario: Total EV enforcement
- **WHEN** the user attempts to increase a stat value such that the total sum would exceed 510
- **THEN** the system SHALL cap the stat value at the maximum allowed to keep the total at 510.

#### Scenario: Total EV display
- **WHEN** the total EV count is exactly 510
- **THEN** the system SHALL display the count as 510 / 510.
