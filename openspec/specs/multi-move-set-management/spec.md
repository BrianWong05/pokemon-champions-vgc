## ADDED Requirements

### Requirement: Maximum Move Slots
The system SHALL support a maximum of 4 move slots for each Pokémon in the Damage Calculator.

#### Scenario: Slot limitation
- **WHEN** a user selects moves for an Attacker
- **THEN** they SHALL be able to fill up to 4 distinct slots with different moves.

### Requirement: Active Move Selection
The system SHALL allow the user to select one of the 4 move slots as the "active" move for the damage calculation.

#### Scenario: Switching active move
- **WHEN** a user has 4 moves selected and clicks on the 2nd move slot
- **THEN** the damage results SHALL update immediately to reflect the 2nd move's power, type, and category.
