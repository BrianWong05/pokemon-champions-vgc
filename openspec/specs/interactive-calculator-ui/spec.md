## ADDED Requirements

### Requirement: Interactive Stat Input Form
The system SHALL provide a form with 6 numeric input fields, one for each Pokémon stat.

#### Scenario: Input stat mapping
- **WHEN** the converter page loads
- **THEN** it SHALL display HP, Attack, Defense, Sp. Atk, Sp. Def, and Speed input rows.

### Requirement: Dynamic SP Badge Display
The system SHALL display the converted SP value immediately as the EV input changes.

#### Scenario: Live update
- **WHEN** the user changes the "HP" EV input
- **THEN** the adjacent SP badge SHALL update its value dynamically without page reload.
