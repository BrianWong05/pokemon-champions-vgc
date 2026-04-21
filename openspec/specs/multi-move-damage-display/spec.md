## ADDED Requirements

### Requirement: Simultaneous Move Calculation
The system SHALL compute damage rolls (Min/Max range and percentage) for all 4 slots in the Attacker's move-set simultaneously.

#### Scenario: Displaying multiple results
- **WHEN** the Attacker has 3 moves selected
- **THEN** the system SHALL display 3 distinct result cards at the top of the screen.

### Requirement: Interactive Result Selection
The system SHALL allow users to select an active move by clicking its result card.

#### Scenario: Updating visual focus
- **WHEN** a user clicks on the "Result Card" for Move 3
- **THEN** the system SHALL update the central HP bar and KO probability display to reflect Move 3.

### Requirement: Modified Type Indicator
The system SHALL visually indicate in the results if a move's type was changed by an ability.

#### Scenario: Displaying modified type
- **WHEN** "Pixilate" is active and modifying "Hyper Voice"
- **THEN** the system SHALL render the new type alongside the move name (e.g., "Hyper Voice (Fairy)").

### Requirement: Relative Visual HP Bar
The system SHALL update the visual HP bar in the dashboard to represent damage relative to the Pokémon's current HP.

#### Scenario: Visual damage indication
- **WHEN** the Defender's current HP is 50%
- **THEN** the visual HP bar SHALL start at the 50% mark
- **AND** subtracted damage SHALL animate from that starting point.
