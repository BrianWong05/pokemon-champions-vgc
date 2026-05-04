## ADDED Requirements

### Requirement: Terrain Damage Multipliers
The system SHALL apply a 1.3x damage multiplier to moves of the same type as the active terrain (Electric, Grassy, Psychic) for grounded Pokémon.

#### Scenario: Thunderbolt in Electric Terrain
- **WHEN** the active terrain is "Electric" and the move type is Electric
- **THEN** the system SHALL apply a 1.3x multiplier to the damage.

### Requirement: Grassy Terrain Damage Reduction
The system SHALL apply a 0.5x damage multiplier to Earthquake, Magnitude, and Bulldoze when Grassy Terrain is active.

#### Scenario: Earthquake in Grassy Terrain
- **WHEN** the active terrain is "Grassy" and the move is "Earthquake"
- **THEN** the system SHALL apply a 0.5x multiplier to the damage.

### Requirement: Misty Terrain Dragon Mitigation
The system SHALL apply a 0.5x damage multiplier to Dragon-type moves used against grounded Pokémon when Misty Terrain is active.

#### Scenario: Dragon Pulse in Misty Terrain
- **WHEN** the active terrain is "Misty" and the move type is Dragon
- **THEN** the system SHALL apply a 0.5x multiplier to the damage.
