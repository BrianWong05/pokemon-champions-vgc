## ADDED Requirements

### Requirement: Critical Hit Override Toggle
The system SHALL provide a user interface element that allows the user to force a critical hit for a selected move.

#### Scenario: Toggling critical hit for a move
- **WHEN** the user interacts with the critical hit toggle associated with a move selection
- **THEN** the toggle SHALL update the state to indicate whether the next damage calculation for that move should be a critical hit.

### Requirement: Critical Hit Calculation
The damage calculation SHALL apply the critical hit multiplier (1.5x for base, 2x if crit boost) when the critical hit override is active, regardless of the move's base critical hit chance.

#### Scenario: Forcing a critical hit
- **WHEN** a move is selected and the critical hit override is enabled
- **THEN** the damage calculation SHALL proceed as if a critical hit occurred, applying the appropriate multiplier.

#### Scenario: Normal critical hit chance
- **WHEN** the critical hit override is disabled
- **THEN** the damage calculation SHALL proceed with the move's natural critical hit chance.