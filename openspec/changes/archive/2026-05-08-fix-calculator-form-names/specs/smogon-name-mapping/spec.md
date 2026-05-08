## ADDED Requirements

### Requirement: Smogon Name Normalization
The system SHALL provide a utility to normalize internal Pokémon names (e.g., from the database or UI) into the exact species strings expected by the `@smogon/calc` engine.

#### Scenario: Normalizing a gendered form
- **WHEN** the utility receives "Basculegion (Male)"
- **THEN** it SHALL return "Basculegion".

#### Scenario: Normalizing a regional form
- **WHEN** the utility receives "Alolan Ninetales"
- **THEN** it SHALL return "Ninetales-Alola".

#### Scenario: Normalizing a Mega Evolution
- **WHEN** the utility receives "Mega Charizard Y"
- **THEN** it SHALL return "Charizard-Mega-Y".

#### Scenario: Normalizing a multi-form Pokémon
- **WHEN** the utility receives "Ogerpon (Wellspring Mask)"
- **THEN** it SHALL return "Ogerpon-Wellspring".
