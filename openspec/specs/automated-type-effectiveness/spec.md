## ADDED Requirements

### Requirement: Automatic Effectiveness Calculation
The system SHALL compute the damage multiplier based on the move's type and the defender's types.

#### Scenario: Super effective calculation
- **WHEN** move type is "Water" and defender is "Fire"
- **THEN** effectiveness multiplier is `2.0x`.

#### Scenario: Dual-type resisted calculation
- **WHEN** move type is "Fire" and defender is "Water" and "Dragon"
- **THEN** effectiveness multiplier is `0.25x` (`0.5 * 0.5`).

#### Scenario: Immunity calculation
- **WHEN** move type is "Ground" and defender is "Flying"
- **THEN** effectiveness multiplier is `0.0x`.
