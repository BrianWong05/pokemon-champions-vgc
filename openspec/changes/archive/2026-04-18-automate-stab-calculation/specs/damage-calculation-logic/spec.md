## MODIFIED Requirements

### Requirement: Damage Range Output
The system SHALL output a 16-step roll range, summarized as minimum (85%) and maximum (100%), automatically applying STAB (1.5x) if the move's type matches any of the attacker's types.

#### Scenario: Automatic STAB application
- **WHEN** the attacker is a Fire-type Pokémon (e.g., Charizard) and the move type is set to "Fire"
- **THEN** the system SHALL apply a 1.5x multiplier to the damage calculation.

#### Scenario: No STAB application
- **WHEN** the attacker is a Fire-type Pokémon and the move type is set to "Electric"
- **THEN** the system SHALL NOT apply the STAB multiplier (1.0x).
