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
