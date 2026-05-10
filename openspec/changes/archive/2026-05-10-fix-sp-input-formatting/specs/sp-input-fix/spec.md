## ADDED Requirements

### Requirement: Numeric Input Formatting
The system SHALL treat numeric inputs such that leading zeros are automatically handled (e.g., '01' becomes '1').

#### Scenario: Verify input handling
- **WHEN** a user types '0' followed by '1' in the SP input
- **THEN** the input MUST display '1'.
