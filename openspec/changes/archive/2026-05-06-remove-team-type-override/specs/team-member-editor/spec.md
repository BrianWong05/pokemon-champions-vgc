## MODIFIED Requirements

### Requirement: Detailed Pokémon Configuration
The detailed editor SHALL allow users to modify all aspects of a Pokémon's competitive configuration.

#### Scenario: Configuring Stats (SPs)
- **WHEN** the user adjusts the SP inputs for any stat (HP, Atk, Def, SpA, SpD, Spe)
- **THEN** the configuration is updated and final stats are recalculated.

#### Scenario: Configuring Moves
- **WHEN** the user selects up to 4 moves from the available move pool for that Pokémon
- **THEN** those moves are saved to the configuration.

#### Scenario: Configuring Nature and Ability
- **WHEN** the user selects a nature and an ability
- **THEN** the configuration is updated to reflect these choices.

#### Scenario: Configuring Item
- **WHEN** the user searches and selects a hold item
- **THEN** the item is added to the configuration.

#### Scenario: Absence of Type Override
- **WHEN** the user views the Team Member editor
- **THEN** the manual type override toggle is not present.
