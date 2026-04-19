## MODIFIED Requirements

### Requirement: Compact Stat Grid Layout
The system SHALL display Pokémon stats in a row-based grid consisting of four columns: Stat Label, Base Stat, SP (Stat Points), and Total Calculated Stat.

#### Scenario: Stat row alignment
- **WHEN** the Attacker or Defender panel is rendered
- **THEN** all 6 stats SHALL be aligned in a consistent grid where headers and values are vertically synchronized.

### Requirement: Total SP Tracking
The system SHALL calculate and display the total SP consumed by the current spread at the bottom of the stat grid.

#### Scenario: SP limit warning
- **WHEN** the total SP consumed exceeds 66
- **THEN** the total counter SHALL turn red to indicate an invalid spread.
