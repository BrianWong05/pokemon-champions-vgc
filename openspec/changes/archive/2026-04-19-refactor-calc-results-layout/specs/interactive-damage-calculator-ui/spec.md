## MODIFIED Requirements

### Requirement: Layout Structure
The UI SHALL use a top-down structure where results are at the top and configuration panels are at the bottom.

#### Scenario: Responsive layout
- **WHEN** viewed on a desktop screen
- **THEN** results SHALL span the full width at the top, and Attacker/Defender panels SHALL be side-by-side below.

### Requirement: Visual HP Bar
The system SHALL provide a large, central visual HP bar representing the defender's remaining health.

#### Scenario: HP bar depletion
- **WHEN** an active move is selected
- **THEN** the HP bar SHALL show the remaining health after the Max Roll of that move, colored by status (Green > 50%, Yellow 20-50%, Red < 20%).
