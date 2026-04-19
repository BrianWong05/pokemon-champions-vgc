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
## MODIFIED Requirements

### Requirement: Layout Structure
The UI SHALL use a top-down structure where results are at the top and configuration panels are at the bottom.

#### Scenario: Responsive layout
- **WHEN** viewed on a desktop screen
- **THEN** results SHALL span the full width at the top, and Attacker/Defender panels SHALL be side-by-side below.

### Requirement: Visual HP Bar
The system SHALL provide a large, central visual HP bar representing the defender's remaining health.

#### Scenario: HP bar depletion
- **WHEN** an active move is selected
- **THEN** the HP bar SHALL show the remaining health after the Max Roll of that move, colored by status (Green > 50%, Yellow 20-50%, Red < 20%).
## MODIFIED Requirements

### Requirement: Reactive Stat Inputs
The UI SHALL update the damage results immediately upon any stat change, including SP slider adjustments, Nature toggle changes, or stat stage increments/decrements.

#### Scenario: Adjusting stat stage
- **WHEN** the user increments the Attack stage
- **THEN** all damage results at the top of the dashboard SHALL recalculate immediately to reflect the new multiplier.

#### Scenario: Toggling nature inline
- **WHEN** the user clicks the `+` button on a stat row
- **THEN** the damage results at the top of the screen SHALL recalculate immediately to reflect the new multiplier.
