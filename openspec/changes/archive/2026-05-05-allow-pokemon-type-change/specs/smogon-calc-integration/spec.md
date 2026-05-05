## ADDED Requirements

### Requirement: Mapping Overridden Types to Smogon Pokemon
The system SHALL use the application's current `type1` and `type2` state values when instantiating the Smogon `Pokemon` object, ensuring damage calculations reflect manual type overrides.

#### Scenario: Calculating damage with overridden types
- **WHEN** a Pokémon has been manually changed to "Water" type in the UI
- **THEN** the `Pokemon` object constructed for the Smogon engine SHALL have `types: ['Water']`.
