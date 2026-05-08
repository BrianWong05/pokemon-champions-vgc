## ADDED Requirements

### Requirement: Name Mapping Integration
The `mapToSmogonPokemon` function SHALL ensure that the species name passed to the `@smogon/calc` `Pokemon` constructor is first normalized using the name normalization utility.

#### Scenario: Constructing a Pokemon instance
- **WHEN** `mapToSmogonPokemon` is called with a raw Pokémon name from the UI state
- **THEN** it SHALL pass the normalized name to the `@smogon/calc` constructor so that the correct base stats and typing are resolved internally by the engine.
