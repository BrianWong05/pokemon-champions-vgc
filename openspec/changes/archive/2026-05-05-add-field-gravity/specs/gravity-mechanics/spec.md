## ADDED Requirements

### Requirement: Gravity Grounding Effect
The system SHALL ground all Pokémon when Gravity is active, removing Ground-type immunity from Flying-type Pokémon and those with the Levitate ability.

#### Scenario: Earthquake vs Flying-type in Gravity
- **WHEN** Gravity is active and the Defender is Flying-type
- **THEN** Ground-type moves SHALL deal damage to the Defender based on their type effectiveness (ignoring Flying-type immunity).

### Requirement: Gravity Accuracy Modification
The system SHALL multiply the accuracy of all moves by 1.67x when Gravity is active.

#### Scenario: Move accuracy in Gravity
- **WHEN** Gravity is active
- **THEN** the Smogon engine SHALL calculate results based on increased move accuracy (1.67x).
