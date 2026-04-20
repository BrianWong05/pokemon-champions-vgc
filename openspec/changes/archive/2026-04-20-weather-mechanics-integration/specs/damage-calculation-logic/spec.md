## ADDED Requirements

### Requirement: Weather Integration in Pipeline
The damage calculation pipeline SHALL integrate weather modifiers at appropriate stages: Move Type (Step 0), Base Power (Step 1), Stats (Step 2), and Damage (Step 3).

#### Scenario: Weather damage modifier order
- **WHEN** calculating damage in Sun
- **THEN** the system SHALL apply the 1.5x Fire-type boost after Base Damage calculation but before STAB/Effectiveness.
