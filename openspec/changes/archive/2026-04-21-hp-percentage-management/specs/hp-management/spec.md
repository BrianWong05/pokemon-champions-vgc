## ADDED Requirements

### Requirement: Pokémon Current HP Percentage Control
The system SHALL allow users to adjust the current HP percentage of both the Attacker and the Defender.

#### Scenario: Adjusting HP percentage
- **WHEN** the user moves the HP percentage slider for a Pokémon
- **THEN** the system SHALL update the current HP value display
- **AND** recalculate KO probability based on the new HP value.

### Requirement: Dynamic KO Calculation based on Current HP
The system SHALL evaluate KO potential against the Defender's current HP rather than their maximum HP.

#### Scenario: Guaranteed KO at low health
- **WHEN** the Defender's current HP is 50/150 (33%) and the move deals 60 damage
- **THEN** the system SHALL display "Guaranteed KO".
