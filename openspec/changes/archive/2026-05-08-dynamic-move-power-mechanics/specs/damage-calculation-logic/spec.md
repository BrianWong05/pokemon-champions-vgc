## MODIFIED Requirements

### Requirement: Damage Calculation Integration
The system SHALL support dynamic move power modifiers during the damage calculation pipeline, ensuring that moves with variable base power have their power correctly adjusted before the damage roll is calculated.

#### Scenario: Recalculating damage with modified power
- **WHEN** a move with dynamic power is used in a calculation
- **THEN** the calculator SHALL first determine the current base power based on the battle state, and then use this adjusted power in the `@smogon/calc` damage formula.
