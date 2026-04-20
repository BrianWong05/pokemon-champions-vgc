## ADDED Requirements

### Requirement: Multi-Stage Calculation Sequence
The system SHALL apply ability modifiers at three distinct stages of the damage formula: Base Power, Stats, and Final Damage.

#### Scenario: Calculation Order
- **WHEN** performing a damage calculation
- **THEN** the system SHALL apply Base Power modifiers first
- **AND** then apply Stat modifiers during stat calculation
- **AND** finally apply Final Damage modifiers after STAB and effectiveness.
