## ADDED Requirements

### Requirement: HP-Based Pipeline Integration
The system SHALL integrate the Attacker's current HP percentage into the damage calculation pipeline.

#### Scenario: HP percentage data passing
- **WHEN** calculating damage
- **THEN** the system SHALL pass the attacker's current HP percentage to the Base Power modifier function.
