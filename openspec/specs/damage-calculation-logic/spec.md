## ADDED Requirements

### Requirement: Native KO Chance String Usage
The system SHALL display the exact KO chance string provided by `@smogon/calc` (e.g., "guaranteed 3HKO", "possible 2HKO") in place of manually computed survival indicators.

#### Scenario: Displaying a guaranteed KO
- **WHEN** a damage calculation results in a guaranteed knockout
- **THEN** the UI SHALL extract and display the string containing "guaranteed OHKO" from the Smogon result.

#### Scenario: Displaying a possible KO
- **WHEN** a damage calculation has a chance to knockout
- **THEN** the UI SHALL extract and display the string containing "possible OHKO" or similar chance text.

#### Scenario: Immunity fallback
- **WHEN** a move results in 0 damage (immunity)
- **THEN** the UI SHALL gracefully default to displaying "Survival" or "--".

### Requirement: Item Parameter Integration
The damage calculation utilities SHALL accept an `item` property for both the Attacker and Defender and pass it through to the underlying engine, ensuring that item-specific effects like type-resist berries are natively processed.

#### Scenario: Passing item to Smogon calc
- **WHEN** `calculateDamage` or an equivalent wrapper is called with an `item` on the attacker
- **THEN** it SHALL initialize the `@smogon/calc` `Pokemon` object with the specified `item`.

#### Scenario: Passing berry to Defender
- **WHEN** the wrapper is called with a berry `item` on the defender
- **THEN** the `@smogon/calc` `Pokemon` object SHALL receive that berry, allowing the engine to calculate damage reduction.

### Requirement: Smogon Damage Range Extraction
The damage calculation utilities SHALL extract the exact 16-roll damage array provided by `@smogon/calc` and calculate the minimum and maximum damage percentages directly from it.

#### Scenario: Extracting damage bounds
- **WHEN** the `@smogon/calc` engine completes a calculation
- **THEN** the utility SHALL identify the lowest and highest values in the `damage` array and return them as the minimum and maximum percentage bounds to the UI.

#### Scenario: Handling fixed damage
- **WHEN** the `@smogon/calc` engine returns a single number for damage (e.g., fixed damage moves)
- **THEN** the utility SHALL treat that single number as both the minimum and maximum bounds.

## REMOVED Requirements

### Requirement: Damage Range Output
**Reason**: Replaced by `@smogon/calc` which outputs an exact range array of 16 rolls.
**Migration**: Use the result object from `@smogon/calc` directly.

### Requirement: Ability Modifier Integration
**Reason**: Replaced by `@smogon/calc` native ability support.
**Migration**: Pass the attacker's and defender's abilities in the `Pokemon` objects to `@smogon/calc`.

### Requirement: Multi-Stage Calculation Sequence
**Reason**: Replaced by `@smogon/calc` internal calculation pipeline.
**Migration**: Use `calculate()` from `@smogon/calc`.

### Requirement: Modified Type Pipeline
**Reason**: Replaced by `@smogon/calc` native mechanic support.
**Migration**: Pass the move and ability correctly to `calculate()`.

### Requirement: Weather Integration in Pipeline
**Reason**: Replaced by `@smogon/calc` native weather support.
**Migration**: Pass the weather in the `Field` object to `calculate()`.

### Requirement: Spread Modifier Pipeline Integration
**Reason**: Replaced by `@smogon/calc` native spread mechanic support.
**Migration**: Set `isDouble` to true in `Field` object.

### Requirement: HP-Based Pipeline Integration
**Reason**: Replaced by `@smogon/calc` native HP support.
**Migration**: Pass current HP in the `Pokemon` object.

### Requirement: HP-Aware Pipeline
**Reason**: Replaced by `@smogon/calc` native HP support.
**Migration**: Pass current HP in both Attacker and Defender `Pokemon` objects.
