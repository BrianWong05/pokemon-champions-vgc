## ADDED Requirements

### Requirement: Pokémon-Specific Move Selection
The system SHALL provide a mechanism to select moves only from the set of moves a Pokémon can learn via level-up, machine, or tutor.

#### Scenario: Populating moves list
- **WHEN** an Attacker is selected
- **THEN** the system SHALL fetch and display only moves valid for that Pokémon's learned move-set.

### Requirement: Automatic Move Property Resolution
The system SHALL automatically retrieve move power, category, and typeId from the database upon selection.

#### Scenario: Selecting a move
- **WHEN** the user selects the move "Fire Blast"
- **THEN** the system SHALL set power to `110`, category to `Special`, and typeId to `10`.
