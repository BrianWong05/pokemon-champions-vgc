## ADDED Requirements

### Requirement: Domain-Centric Logic Organization
The system SHALL organize core business logic (hooks, utils, services) into feature-based directories under `src/features/`.

#### Scenario: Verify domain organization
- **WHEN** a feature (e.g., Damage Calculator) needs logic
- **THEN** that logic MUST reside within its respective `src/features/<feature-name>/` directory, rather than a global `src/hooks/` or `src/utils/` folder.

### Requirement: Global Utilities Cleanliness
The system SHALL strictly limit the global `src/utils/` folder to pure, non-domain-specific functions (e.g., date formatting, generic math).

#### Scenario: Move domain-specific utility
- **WHEN** a utility is identified as specific to the damage calculator
- **THEN** it MUST be moved out of `src/utils/` into `src/features/damage-calc/utils/`.
