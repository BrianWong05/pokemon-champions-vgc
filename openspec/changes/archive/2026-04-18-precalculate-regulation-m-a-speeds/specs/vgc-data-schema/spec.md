## ADDED Requirements

### Requirement: Pre-calculated Pokémon speed storage
The system SHALL support storing pre-calculated speed benchmarks for competitive play in the `calculated_speeds` table.

#### Scenario: Pre-calculated stats for competitive play
- **WHEN** a record is added to the `calculated_speeds` table
- **THEN** the system SHALL store the corresponding `maxPlus`, `maxNeutral`, `uninvested`, and `minMinus` values as integers.
