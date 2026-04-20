## ADDED Requirements

### Requirement: Modified Type Pipeline
The system SHALL use the modified move type (if any) for STAB calculation and Type Effectiveness.

#### Scenario: STAB with modified type
- **WHEN** a Sylveon (Fairy-type) with "Pixilate" uses "Hyper Voice" (Normal -> Fairy)
- **THEN** the system SHALL apply the 1.5x STAB multiplier because the modified type (Fairy) matches Sylveon's type.
