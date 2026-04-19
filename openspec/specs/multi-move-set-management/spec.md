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
## MODIFIED Requirements

### Requirement: Active Move Selection
The active move selection logic SHALL be moved from the move inputs to the results display.

#### Scenario: Selection source change
- **WHEN** configuring the move-set in the Attacker panel
- **THEN** no radio buttons or selection indicators SHALL be present next to the inputs.

### Requirement: Move Slot Clearing
The system SHALL provide a mechanism to clear a selected move from any of the 4 move slots in the Damage Calculator.

#### Scenario: Clearing a selected move
- **WHEN** a user clicks the "Clear" button on a move slot that contains a move
- **THEN** the system SHALL reset that slot to an empty state
- **AND** the search interface for that slot SHALL become available again.

### Requirement: Active Slot Synchronization after Removal
The system SHALL ensure that if the currently active move slot is cleared, the system state remains stable and does not crash during damage calculation.

#### Scenario: Removing the active move
- **WHEN** the user clears the move slot that is currently selected as "Active"
- **THEN** the damage results for that side SHALL reflect that no move is selected
- **AND** the "Active Tuning" panel SHALL handle the empty state gracefully.
