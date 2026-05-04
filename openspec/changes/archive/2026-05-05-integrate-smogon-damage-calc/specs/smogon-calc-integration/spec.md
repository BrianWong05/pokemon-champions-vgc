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
- **THEN** the wrapper function SHALL pass the correct corresponding string or configuration to `@smogon/calc`.
