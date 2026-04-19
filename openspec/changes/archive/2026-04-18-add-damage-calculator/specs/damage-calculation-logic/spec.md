## ADDED Requirements

### Requirement: Custom Stat Calculation
The system SHALL compute Pokémon stats using the Champions formulas:
- HP: `Base + 75 + SP`
- Others: `floor((Base + 20 + SP) * Nature)`

#### Scenario: HP Calculation
- **WHEN** Base HP is 100 and SP is 32
- **THEN** Result is `207`

#### Scenario: Attack Calculation
- **WHEN** Base Atk is 100, SP is 32, and Nature is 1.1
- **THEN** Result is `floor(152 * 1.1)` = `167`

### Requirement: Base Damage Equation
The system SHALL calculate base damage using the formula: `floor(floor((22 * Power * Atk / Def) / 50) + 2)`.

#### Scenario: Standard calculation
- **WHEN** Power is 100, Atk is 100, and Def is 100
- **THEN** Result is `floor(floor(2200 / 50) + 2)` = `floor(44 + 2)` = `46`

### Requirement: Damage Range Output
The system SHALL output a 16-step roll range, summarized as minimum (85%) and maximum (100%).

#### Scenario: Min/Max Calculation
- **WHEN** Base Damage is 100 and Modifiers are 1.0
- **THEN** Min is `85` and Max is `100`.
