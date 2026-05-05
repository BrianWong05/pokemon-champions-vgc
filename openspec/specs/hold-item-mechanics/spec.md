## ADDED Requirements

### Requirement: Hold Item Engine Integration
The system SHALL support hold items by passing the selected item name to the `@smogon/calc` engine.

#### Scenario: Attacker with Choice Band
- **WHEN** the Attacker holds a Choice Band and uses a physical move
- **THEN** the damage engine SHALL compute the damage with the 1.5x Attack modifier applied by `@smogon/calc`.

#### Scenario: Defender with Assault Vest
- **WHEN** the Defender holds an Assault Vest and is hit by a special move
- **THEN** the damage engine SHALL compute the damage with the 1.5x Special Defense modifier applied by `@smogon/calc`.
