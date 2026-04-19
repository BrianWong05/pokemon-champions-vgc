## MODIFIED Requirements

### Requirement: Pokémon-Specific Move Selection
The system SHALL provide 4 distinct move slots for the Attacker, allowing users to build a full move-set.

#### Scenario: Displaying move slots
- **WHEN** the Attacker panel is rendered
- **THEN** it SHALL display 4 rows or areas for move selection, each with its own search and detail display.

### Requirement: Reactive Stat Inputs
The UI SHALL update the damage results immediately upon any stat, slider, Pokémon selection, move selection, or active move slot change.

#### Scenario: Selecting an active move slot
- **WHEN** the user selects a move in slot 3 and makes it active
- **THEN** the damage percentage results SHALL recalculate immediately based on the move in slot 3.
