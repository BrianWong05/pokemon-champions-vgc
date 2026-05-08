## ADDED Requirements

### Requirement: Multi-Set Parser
The system SHALL parse a text block containing multiple Pokémon Showdown export sets and extract an array of Pokémon configurations.

#### Scenario: Parse a full team
- **WHEN** a text block containing 6 Pokémon sets is provided
- **THEN** the system SHALL return 6 valid Pokémon configuration objects.

### Requirement: Team Batch State Update
The system SHALL provide a mechanism to update the current team's state with an array of imported Pokémon.

#### Scenario: Batch loading to team
- **WHEN** the user imports a team of 6
- **THEN** all 6 team slots SHALL be populated with the parsed Pokémon data.
