## ADDED Requirements

### Requirement: Modular Damage Calculator
The system SHALL organize the `DamageCalculator` logic into a modular architecture, decoupling UI components from business logic and state orchestration.

#### Scenario: Component Decoupling
- **WHEN** the `DamageCalculator` page is rendered
- **THEN** it SHALL be a thin orchestrator utilizing sub-components for the Attacker Panel, Defender Panel, and Result Summary.

#### Scenario: Business Logic Abstraction
- **WHEN** a damage calculation is triggered
- **THEN** the component SHALL call pure utility functions from `src/utils/damage-calc/` and a state orchestration hook, rather than calculating damage directly in the UI.
