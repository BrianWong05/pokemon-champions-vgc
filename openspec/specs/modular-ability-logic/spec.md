## ADDED Requirements

### Requirement: Base Power Ability Modifiers
The system SHALL support abilities that modify the Base Power of a move (e.g., Fairy Aura, Technician).

#### Scenario: Technician boost
- **WHEN** the Attacker has "Technician" and the move power is <= 60
- **THEN** the system SHALL apply a 1.5x multiplier to the Base Power.

### Requirement: Stat Ability Modifiers
The system SHALL support abilities that modify Pokémon stats (e.g., Huge Power, Fur Coat).

#### Scenario: Huge Power boost
- **WHEN** the Attacker has "Huge Power" or "Pure Power"
- **THEN** the system SHALL apply a 2.0x multiplier to the Attack stat.

### Requirement: Final Damage Ability Modifiers
The system SHALL support abilities that modify the final calculated damage (e.g., Thick Fat, Solid Rock).

#### Scenario: Thick Fat reduction
- **WHEN** the Defender has "Thick Fat" and the move type is "Fire" or "Ice"
- **THEN** the system SHALL apply a 0.5x multiplier to the final damage.
