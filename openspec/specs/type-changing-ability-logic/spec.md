## Purpose
Logic for converting move types based on attacker abilities and applying associated power boosts.

## ADDED Requirements

### Requirement: Type Conversion Logic
The system SHALL support converting a move's type based on the attacker's ability before further damage calculation.
- **-ate Abilities**: Pixilate (Normal -> Fairy), Refrigerate (Normal -> Ice), Aerilate (Normal -> Flying), Galvanize (Normal -> Electric).
- **Liquid Voice**: Sound-based moves -> Water.

#### Scenario: Pixilate conversion
- **WHEN** the Attacker has "Pixilate" and uses a Normal-type move (e.g., Hyper Voice)
- **THEN** the system SHALL treat the move as Fairy-type.

#### Scenario: Liquid Voice conversion
- **WHEN** the Attacker has "Liquid Voice" and uses a sound-based move (e.g., Hyper Voice)
- **THEN** the system SHALL treat the move as Water-type.

### Requirement: Type-Changing Power Boost
The system SHALL apply a 1.2x Base Power boost when a move's type is changed by an "-ate" ability (Pixilate, Refrigerate, Aerilate, Galvanize).

#### Scenario: Apply 1.2x boost
- **WHEN** "Pixilate" changes a move from Normal to Fairy
- **THEN** the system SHALL apply a 1.2x multiplier to the move's Base Power.
