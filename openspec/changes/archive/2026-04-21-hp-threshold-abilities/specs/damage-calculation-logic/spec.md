## ADDED Requirements

### Requirement: HP-Aware Pipeline
The system SHALL update the utility function signatures in the damage calculation pipeline to accept current HP percentages for both Attacker and Defender.

#### Scenario: Passing HP to modifiers
- **WHEN** calculating damage
- **THEN** the system SHALL pass the Attacker's current HP percentage to the Base Power and Stat modifier functions
- **AND** pass the Defender's current HP percentage to the Final Damage modifier function.
