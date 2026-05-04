## ADDED Requirements

### Requirement: Field Aura Mapping to Smogon Calc
The system SHALL map the `isFairyAura`, `isDarkAura`, and `isAuraBreak` state variables to their corresponding properties in the `@smogon/calc` `Field` object.

#### Scenario: Passing aura flags to Smogon Field
- **WHEN** `isFairyAura` is true in the application state
- **THEN** the `Field` object passed to Smogon's `calculate` function SHALL have `isFairyAura: true`.
