## MODIFIED Requirements

### Requirement: Damage Range Output
The system SHALL output a 16-step roll range, summarized as minimum (85%) and maximum (100%), automatically applying STAB (1.5x) if the move's type matches any of the attacker's types.

#### Scenario: Automatic STAB application
- **WHEN** the attacker is a Fire-type Pokémon (e.g., Charizard) and the move type is set to "Fire"
- **THEN** the system SHALL apply a 1.5x multiplier to the damage calculation.

#### Scenario: No STAB application
- **WHEN** the attacker is a Fire-type Pokémon and the move type is set to "Electric"
- **THEN** the system SHALL NOT apply the STAB multiplier (1.0x).

### Requirement: Ability Modifier Integration
The damage calculation formula SHALL integrate ability multipliers into the stat calculation pipeline.

#### Scenario: Stat calculation order
- **WHEN** calculating a stat (e.g., Attack)
- **THEN** the system SHALL apply stage multipliers first, and then apply ability multipliers as the final modifier to the resulting stat.

### Requirement: Multi-Stage Calculation Sequence
The system SHALL apply ability modifiers at three distinct stages of the damage formula: Base Power, Stats, and Final Damage.

#### Scenario: Calculation Order
- **WHEN** performing a damage calculation
- **THEN** the system SHALL apply Base Power modifiers first
- **AND** then apply Stat modifiers during stat calculation
- **AND** finally apply Final Damage modifiers after STAB and effectiveness.

### Requirement: Modified Type Pipeline
The system SHALL use the modified move type (if any) for STAB calculation and Type Effectiveness.

#### Scenario: STAB with modified type
- **WHEN** a Sylveon (Fairy-type) with "Pixilate" uses "Hyper Voice" (Normal -> Fairy)
- **THEN** the system SHALL apply the 1.5x STAB multiplier because the modified type (Fairy) matches Sylveon's type.

### Requirement: Weather Integration in Pipeline
The damage calculation pipeline SHALL integrate weather modifiers at appropriate stages: Move Type (Step 0), Base Power (Step 1), Stats (Step 2), and Damage (Step 3).

#### Scenario: Weather damage modifier order
- **WHEN** calculating damage in Sun
- **THEN** the system SHALL apply the 1.5x Fire-type boost after Base Damage calculation but before STAB/Effectiveness.

### Requirement: Spread Modifier Pipeline Integration
The system SHALL integrate the spread damage modifier (0.75x) into the calculation pipeline immediately after Base Damage calculation and before weather/STAB.

#### Scenario: Multi-modifier calculation
- **WHEN** calculating damage for a move
- **THEN** the system SHALL multiply the base damage by 0.75 if `isSpreadTarget` is true.
