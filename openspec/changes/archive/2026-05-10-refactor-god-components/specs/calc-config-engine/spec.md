## ADDED Requirements

### Requirement: Atomic Configuration UI
The Pokémon Configuration Form SHALL be broken down into Atomic Design components (StatSection, MoveSection, MetaSection) to eliminate complex prop interfaces.

#### Scenario: Editing Stats
- **WHEN** a user adjusts an EV slider in the `StatSection`
- **THEN** only the `StatSection` and related state hooks SHALL re-render or handle the local update logic

### Requirement: Composable Engine Hooks
The damage calculation and stat management logic MUST be split into composable hooks (`useStatCalculation`, `useDamageResults`) that can be tested in isolation.

#### Scenario: Calculating Damage
- **WHEN** inputs to the `useDamageResults` hook change
- **THEN** it SHALL return an updated results object by invoking the underlying pure utility functions
