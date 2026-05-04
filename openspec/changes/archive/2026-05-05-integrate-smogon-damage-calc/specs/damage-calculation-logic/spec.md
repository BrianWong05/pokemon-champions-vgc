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
