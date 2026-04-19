## ADDED Requirements

### Requirement: Reactive Stat Inputs
The UI SHALL update the damage results immediately upon any stat or slider change.

#### Scenario: Dragging the SP slider
- **WHEN** the user drags the Attacker's Atk SP slider from 0 to 32
- **THEN** the damage percentage results SHALL increase accordingly in real-time.

### Requirement: Visual HP Feedback
The system SHALL display an HP bar that visualizes the remaining health after maximum damage.

#### Scenario: High damage feedback
- **WHEN** calculated Max Damage is > 50% but < 100% of Max HP
- **THEN** the HP bar color SHALL change to yellow.
- **WHEN** calculated Max Damage is > 100%
- **THEN** the HP bar SHALL be empty and results SHALL indicate a 100% KO chance.
