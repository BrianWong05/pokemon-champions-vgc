## ADDED Requirements

### Requirement: Fairy Aura Damage Boost
The system SHALL apply a 1.33x damage multiplier to Fairy-type moves when Fairy Aura is active on the field, unless Aura Break is also active.

#### Scenario: Fairy move with Fairy Aura active
- **WHEN** the field state has `isFairyAura` set to true and the move type is Fairy
- **THEN** the system SHALL apply a 1.33x multiplier to the damage calculation.

### Requirement: Dark Aura Damage Boost
The system SHALL apply a 1.33x damage multiplier to Dark-type moves when Dark Aura is active on the field, unless Aura Break is also active.

#### Scenario: Dark move with Dark Aura active
- **WHEN** the field state has `isDarkAura` set to true and the move type is Dark
- **THEN** the system SHALL apply a 1.33x multiplier to the damage calculation.

### Requirement: Aura Break Mitigation
The system SHALL invert the Aura modifiers (Fairy Aura, Dark Aura) when Aura Break is active on the field, resulting in a 0.75x multiplier instead of 1.33x.

#### Scenario: Fairy move with Fairy Aura and Aura Break active
- **WHEN** `isFairyAura` and `isAuraBreak` are both true
- **THEN** the system SHALL apply a 0.75x multiplier to Fairy moves.
