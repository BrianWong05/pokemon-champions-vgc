## ADDED Requirements

### Requirement: Team Data Mapping
The system SHALL provide a utility to map a team member's configuration (Species, Form, Item, Ability, Nature, EVs, IVs, Moves) into the internal state format used by the damage calculator.

#### Scenario: Mapping a fully configured team member
- **WHEN** a team member with complete stats and moves is provided
- **THEN** the mapping utility SHALL return a state object compatible with the calculator's `Attacker` or `Defender` panels.

### Requirement: Active Team Retrieval
The system SHALL allow the damage calculator to access the list of all saved teams from the user's storage.

#### Scenario: Fetching teams in calculator
- **WHEN** the "My Team" selection is opened in the calculator
- **THEN** the system SHALL retrieve and display the list of all teams currently saved in local storage.
