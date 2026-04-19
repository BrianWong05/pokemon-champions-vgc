# stat-stage-mechanics

## Purpose
The system SHALL support tracking and applying fractional multipliers based on Pokémon stat stages (-6 to +6) to ensure accurate competitive damage simulations.

## Requirements

### Requirement: Stat Stage Tracking
The system SHALL support tracking stat stages from -6 to +6 for Attack, Defense, Sp. Atk, Sp. Def, and Speed.

#### Scenario: Incrementing a stage
- **WHEN** a user clicks the increment button on a stat at stage 0
- **THEN** the stage SHALL become +1.

#### Scenario: Clamping stages
- **WHEN** a user tries to increment a stat already at stage +6
- **THEN** the stage SHALL remain +6.

### Requirement: Fractional Stage Multipliers
The system SHALL apply fractional multipliers based on the current stat stage using the formula: `Positive (2+n)/2`, `Negative 2/(2+|n|)`.

#### Scenario: Calculating positive multiplier
- **WHEN** a stat is at stage +2
- **THEN** the system SHALL apply a 2.0x (4/2) multiplier to the raw stat.

#### Scenario: Calculating negative multiplier
- **WHEN** a stat is at stage -2
- **THEN** the system SHALL apply a 0.5x (2/4) multiplier to the raw stat.

### Requirement: Stat Calculation Order
The system SHALL apply the Nature multiplier first, floor the result, then apply the stage multiplier and floor again.

#### Scenario: Multi-step stat calculation
- **WHEN** a Pokémon has a raw stat total of 100, a 1.1x Nature boost, and a +1 stage boost
- **THEN** the intermediate stat SHALL be 110 (floor(100 * 1.1)) and the final stat SHALL be 165 (floor(110 * 1.5)).
