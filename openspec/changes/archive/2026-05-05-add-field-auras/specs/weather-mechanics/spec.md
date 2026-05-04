## ADDED Requirements

### Requirement: Field Aura Toggles
The system SHALL provide UI controls to toggle field-wide auras (Fairy Aura, Dark Aura, Aura Break) independently of the weather selection.

#### Scenario: Toggling Fairy Aura
- **WHEN** the user selects the "Fairy Aura" toggle in the field options
- **THEN** the system SHALL update the state to reflect `isFairyAura: true` and trigger a recalculation.
