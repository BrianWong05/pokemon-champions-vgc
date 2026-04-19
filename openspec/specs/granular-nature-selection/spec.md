## ADDED Requirements

### Requirement: Granular Nature Selection
The system SHALL allow users to individually boost or hinder specific stats (Atk, Def, SpA, SpD, Spe) for each Pokémon.

#### Scenario: Boosting a stat
- **WHEN** a user clicks the `+` button next to "Attack"
- **THEN** the "Attack" stat SHALL be marked as boosted (1.1x).

### Requirement: Nature Mutual Exclusivity
The system SHALL enforce that exactly one stat can be boosted and exactly one stat can be hindered at any time for each Pokémon.

#### Scenario: Switching boosted stat
- **WHEN** "Attack" is currently boosted and the user clicks `+` on "Speed"
- **THEN** "Attack" SHALL no longer be boosted and "Speed" SHALL become the new boosted stat.

#### Scenario: Clearing a conflict
- **WHEN** "Defense" is currently hindered and the user clicks `+` on "Defense"
- **THEN** "Defense" SHALL become boosted and SHALL no longer be hindered.

### Requirement: Multiplier Application
The system SHALL apply a 1.1x multiplier to the boosted stat and a 0.9x multiplier to the hindered stat during calculation.

#### Scenario: Calculating stat with Nature
- **WHEN** "Attack" is boosted and its base+SP total is 100
- **THEN** the final calculated stat SHALL be 110.
