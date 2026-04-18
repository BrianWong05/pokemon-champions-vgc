## ADDED Requirements

### Requirement: EV to SP Conversion Formula
The system SHALL calculate the SP for a given EV value using the formula: `Math.floor((EV + 4) / 8)`.

#### Scenario: Basic conversion
- **WHEN** EV is 252
- **THEN** SP is `floor(256 / 8)` = `32`.

#### Scenario: Minimal EV conversion
- **WHEN** EV is 0
- **THEN** SP is `floor(4 / 8)` = `0`.

#### Scenario: Standard VGC benchmark
- **WHEN** EV is 4
- **THEN** SP is `floor(8 / 8)` = `1`.

### Requirement: Total Constraint Validation
The system SHALL monitor the total EVs and total SP and provide visual feedback for limit exceeding.

#### Scenario: Total EV exceeding limit
- **WHEN** the sum of all 6 stats' EVs is greater than 510
- **THEN** the system SHALL display the total EV count in red.

#### Scenario: Total SP calculation
- **WHEN** a spread is entered
- **THEN** the system SHALL display the sum of all generated SP values (max 66).
