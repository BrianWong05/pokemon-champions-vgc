## ADDED Requirements

### Requirement: Ability Fetching and Display
The system SHALL fetch legal abilities for the selected Pokémon and display them in a selection interface.

#### Scenario: Selection behavior
- **WHEN** a Pokémon is selected
- **THEN** the system SHALL fetch its legal abilities and default the active selection to the first available ability.

### Requirement: Ability Stat Modifiers
The system SHALL apply stat multipliers based on the selected ability of the Attacker or Defender.

#### Scenario: Huge Power application
- **WHEN** the Attacker has the "Huge Power" or "Pure Power" ability
- **THEN** the system SHALL apply a 2.0x multiplier to the Attacker's Attack stat.

#### Scenario: Guts application
- **WHEN** the Attacker has the "Guts" ability and a status condition is active
- **THEN** the system SHALL apply a 1.5x multiplier to the Attacker's Attack stat.
