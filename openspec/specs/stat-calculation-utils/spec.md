## ADDED Requirements

### Requirement: Calculate Speed using Custom Formula
The system SHALL compute Pokémon speed stats based on the Pokémon Champions formula: `floor((Base + 20 + SP) * Nature)`.

#### Scenario: Max Speed (+Nature) Calculation
- **WHEN** Base Speed is 135, SP is 32, and Nature multiplier is 1.1
- **THEN** Result is `floor((135 + 20 + 32) * 1.1)` = `floor(187 * 1.1)` = `205`

#### Scenario: Max Speed (Neutral) Calculation
- **WHEN** Base Speed is 135, SP is 32, and Nature multiplier is 1.0
- **THEN** Result is `135 + 20 + 32` = `187`

#### Scenario: Uninvested Speed Calculation
- **WHEN** Base Speed is 135, SP is 0, and Nature multiplier is 1.0
- **THEN** Result is `135 + 20` = `155`

#### Scenario: Min Speed (-Nature) Calculation
- **WHEN** Base Speed is 135, SP is 0, and Nature multiplier is 0.9
- **THEN** Result is `floor((135 + 20) * 0.9)` = `floor(155 * 0.9)` = `139`
