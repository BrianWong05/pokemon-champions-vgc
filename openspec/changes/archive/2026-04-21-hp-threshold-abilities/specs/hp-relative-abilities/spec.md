## Purpose
Logic for identifying and applying modifiers for abilities that trigger based on current HP percentage thresholds.

## ADDED Requirements

### Requirement: Full HP Defender Threshold (Multiscale/Shadow Shield)
The system SHALL apply a 0.5x final damage reduction if the Defender has "Multiscale" or "Shadow Shield" and is at 100% current HP.

#### Scenario: Multiscale active
- **WHEN** the Defender has "Multiscale" and their current HP percentage is 100%
- **THEN** the system SHALL apply a 0.5x multiplier to the final damage.

#### Scenario: Multiscale inactive
- **WHEN** the Defender has "Multiscale" and their current HP percentage is < 100%
- **THEN** the system SHALL apply a 1.0x multiplier to the final damage.

### Requirement: Attacker Low HP Boost (Starter Abilities)
The system SHALL apply a 1.5x Base Power boost for moves matching the type of a "Starter" ability if the Attacker is at or below 33.33% current HP.
- Abilities: Blaze (Fire), Torrent (Water), Overgrow (Grass), Swarm (Bug).

#### Scenario: Blaze triggered
- **WHEN** the Attacker has "Blaze" and their current HP percentage is 30%
- **AND** the move type is "Fire"
- **THEN** the system SHALL apply a 1.5x multiplier to the move's Base Power.

### Requirement: Attacker Half HP Penalty (Defeatist)
The system SHALL apply a 0.5x stat penalty to Attack and Special Attack if the Attacker has "Defeatist" and is at or below 50% current HP.

#### Scenario: Defeatist active
- **WHEN** the Attacker has "Defeatist" and their current HP percentage is 50%
- **THEN** the system SHALL apply a 0.5x multiplier to both Attack and Special Attack stats.
