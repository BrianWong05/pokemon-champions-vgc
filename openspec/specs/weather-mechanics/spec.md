## ADDED Requirements

### Requirement: Weather-Based Type Modification (Weather Ball)
The system SHALL change the move type of "Weather Ball" based on the active weather.
- Sun -> Fire
- Rain -> Water
- Sandstorm -> Rock
- Snow -> Ice

#### Scenario: Weather Ball in Sun
- **WHEN** the active weather is "Sun" and the move is "Weather Ball"
- **THEN** the system SHALL treat the move as Fire-type.

### Requirement: Weather-Based Base Power Boost (Weather Ball)
The system SHALL double the Base Power of "Weather Ball" if any weather is active (Sun, Rain, Sandstorm, Snow).

#### Scenario: Weather Ball power boost
- **WHEN** the active weather is "Rain" and the move is "Weather Ball"
- **THEN** the system SHALL apply a 2.0x multiplier to its Base Power.

### Requirement: Weather Stat Buffs (Gen 9)
The system SHALL apply stat multipliers based on weather and Pokémon types.
- Sandstorm: 1.5x Sp. Def for Rock-type Pokémon.
- Snow: 1.5x Defense for Ice-type Pokémon.

#### Scenario: Sandstorm Sp. Def boost
- **WHEN** the active weather is "Sandstorm" and the Defender is a Rock-type Pokémon
- **THEN** the system SHALL apply a 1.5x multiplier to its Special Defense stat.

### Requirement: Weather Damage Modifiers
The system SHALL apply damage multipliers for specific move types in certain weather conditions.
- Sun: 1.5x for Fire moves, 0.5x for Water moves.
- Rain: 1.5x for Water moves, 0.5x for Fire moves.

#### Scenario: Fire move in Sun
- **WHEN** the active weather is "Sun" and the move type is Fire
- **THEN** the system SHALL apply a 1.5x multiplier to the damage.

### Requirement: Field Aura Toggles
The system SHALL provide UI controls to toggle field-wide auras (Fairy Aura, Dark Aura, Aura Break) independently of the weather selection.

#### Scenario: Toggling Fairy Aura
- **WHEN** the user selects the "Fairy Aura" toggle in the field options
- **THEN** the system SHALL update the state to reflect `isFairyAura: true` and trigger a recalculation.

### Requirement: Field Terrain Toggles
The system SHALL provide UI controls to select the active field terrain (Electric, Grassy, Misty, Psychic, None) independently of the weather selection.

#### Scenario: Selecting Electric Terrain
- **WHEN** the user clicks the "Electric" terrain button
- **THEN** the system SHALL update the state to reflect `terrain: 'Electric'` and trigger a recalculation.
