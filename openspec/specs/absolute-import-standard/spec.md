## ADDED Requirements

### Requirement: Enforce absolute imports in codebase
All source files in the `src` directory SHALL use absolute imports using the `@` alias for any module outside their immediate directory.

#### Scenario: Refactoring relative imports
- **WHEN** a file contains an import starting with `../`
- **THEN** it SHALL be refactored to use a path starting with `@/`.

#### Scenario: Verifying refactor
- **WHEN** the refactor is complete
- **THEN** a grep search for `from '../` in the `src` directory SHALL return no results.
