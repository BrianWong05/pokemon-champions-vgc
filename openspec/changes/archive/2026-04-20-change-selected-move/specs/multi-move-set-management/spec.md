## ADDED Requirements

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
