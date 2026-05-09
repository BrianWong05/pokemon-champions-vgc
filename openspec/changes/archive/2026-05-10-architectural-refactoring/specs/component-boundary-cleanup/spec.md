## ADDED Requirements

### Requirement: Atomic Boundary Correction
The system SHALL strictly define 'atoms' as single, non-composite elements. Any component containing business logic, internal state, or composition of multiple elements SHALL be classified as a molecule.

#### Scenario: Verify atomic classification
- **WHEN** a component is proposed for `src/components/atoms/`
- **THEN** it MUST contain no business-logic-coupled state and no composition of multiple interactive sub-elements. Components like `StatInput` containing labels and validation logic MUST be moved to `src/components/molecules/`.
