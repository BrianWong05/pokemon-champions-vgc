## ADDED Requirements

### Requirement: Absolute Import Standard
The system SHALL strictly use absolute imports with the `@/` prefix for all files located within the `src/` directory.

#### Scenario: Verify import path style
- **WHEN** a developer imports a module from a parent directory
- **THEN** the system MUST use the `@/` alias (e.g., `import { Component } from '@/components/Component'`) instead of relative paths (e.g., `../`).

### Requirement: Automated Linting Enforcement
The system SHALL provide a linting rule to restrict relative imports and enforce the use of absolute paths.

#### Scenario: Lint error on relative import
- **WHEN** an import is written as a relative path (e.g., `../../`)
- **THEN** the ESLint process MUST report a violation and prevent successful build completion.
