## ADDED Requirements

### Requirement: External Engine Integration
The system SHALL use the `@smogon/calc` engine to compute damage instead of relying on custom mathematical formulas.

#### Scenario: Damage computation delegation
- **WHEN** the damage calculation utility is invoked
- **THEN** it SHALL construct `Pokemon`, `Move`, and `Field` objects from the application state
- **AND** it SHALL call the `calculate` function from `@smogon/calc` to obtain the result.

### Requirement: Supported Mechanics Mapping
The system SHALL correctly map the application state for abilities, items, nature, EVs/IVs, and weather to the format expected by `@smogon/calc`.

#### Scenario: State translation
- **WHEN** a damage calculation is triggered with a specific weather or ability
### Requirement: Field Aura Mapping to Smogon Calc
The system SHALL map the `isFairyAura`, `isDarkAura`, and `isAuraBreak` state variables to their corresponding properties in the `@smogon/calc` `Field` object.

#### Scenario: Passing aura flags to Smogon Field
- **WHEN** `isFairyAura` is true in the application state
- **THEN** the `Field` object passed to Smogon's `calculate` function SHALL have `isFairyAura: true`.

### Requirement: Field Terrain Mapping to Smogon Calc
The system SHALL map the `terrain` state variable to the `terrain` property in the `@smogon/calc` `Field` object.

#### Scenario: Passing terrain to Smogon Field
- **WHEN** the application state has `terrain: 'Electric'`
- **THEN** the `Field` object passed to Smogon's `calculate` function SHALL have `terrain: 'Electric'`.

### Requirement: Field Terrain Mapping to Smogon Calc
The system SHALL map the `isGravity` state variable to the `isGravity` property in the `@smogon/calc` `Field` object.

#### Scenario: Passing gravity to Smogon Field
- **WHEN** the application state has `isGravity: true`
- **THEN** the `Field` object passed to Smogon's `calculate` function SHALL have `isGravity: true`.
