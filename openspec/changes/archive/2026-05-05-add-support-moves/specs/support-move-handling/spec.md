## ADDED Requirements

### Requirement: Reflect and Light Screen Implementation
The system SHALL reduce incoming physical damage by 50% when Reflect is active for the target's side, and special damage by 50% when Light Screen is active for the target's side.

#### Scenario: Reflect active against physical move
- **WHEN** an attacker uses a physical move against a defender, and Reflect is active on the defender's side
- **THEN** the damage calculation SHALL apply a 0.5x multiplier to the damage dealt.

#### Scenario: Light Screen active against special move
- **WHEN** an attacker uses a special move against a defender, and Light Screen is active on the defender's side
- **THEN** the damage calculation SHALL apply a 0.5x multiplier to the damage dealt.

#### Scenario: Screens with no effect
- **WHEN** Reflect is active but the move is special, or Light Screen is active but the move is physical
- **THEN** the damage calculation SHALL NOT apply any screen-based reduction.

### Requirement: Aurora Veil Implementation
The system SHALL reduce incoming physical and special damage by 50% when Aurora Veil is active for the target's side.

#### Scenario: Aurora Veil active against any move
- **WHEN** an attacker uses a physical or special move against a defender, and Aurora Veil is active on the defender's side
- **THEN** the damage calculation SHALL apply a 0.5x multiplier to the damage dealt.

### Requirement: Helping Hand Implementation
The system SHALL increase the power of an ally's move by 50% when Helping Hand is used by another Pokémon on the same side of the field.

#### Scenario: Ally uses Helping Hand
- **WHEN** an attacker's ally uses Helping Hand on the attacker, and the attacker uses a move
- **THEN** the damage calculation SHALL apply a 1.5x multiplier to the move's power.

### Requirement: Friend Guard Implementation
The system SHALL reduce damage taken by adjacent allies by 25% when Friend Guard is active.

#### Scenario: Ally has Friend Guard
- **WHEN** an adjacent ally possesses the Friend Guard ability, and the target is also an adjacent ally
- **THEN** the damage calculation SHALL apply a 0.75x multiplier to the damage taken by the target.