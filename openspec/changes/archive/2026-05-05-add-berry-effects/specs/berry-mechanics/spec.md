## ADDED Requirements

### Requirement: Type-Resist Berry Integration
The system SHALL apply damage reductions when the Defender is holding a type-resist berry that corresponds to the attacking move's type.

#### Scenario: Defender holding Chople Berry against Fighting move
- **WHEN** the Defender holds a Chople Berry and is hit by a super-effective Fighting-type move
- **THEN** the damage engine SHALL output a damage range that reflects a 50% reduction in damage.