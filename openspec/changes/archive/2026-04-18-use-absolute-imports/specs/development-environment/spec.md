## ADDED Requirements

### Requirement: Absolute import standard
The system SHALL use absolute imports with the `@` alias (pointing to the `src` directory) for all imports from directories outside the current one.

#### Scenario: Importing from a utility directory
- **WHEN** a component in `src/pages/MyPage/` imports a utility from `src/utils/`
- **THEN** the import statement SHALL use the format `import { ... } from '@/utils/...'`.

#### Scenario: Importing from a sibling directory
- **WHEN** a component imports a file from a subdirectory or parent directory
- **THEN** it SHALL prefer the `@` alias over relative `../` paths.
