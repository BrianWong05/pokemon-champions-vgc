## ADDED Requirements

### Requirement: Modular Team Detail Architecture
The Team Detail page SHALL be decomposed into independent sub-components and custom hooks to ensure Single Responsibility.

#### Scenario: Rendering Team Detail
- **WHEN** the user navigates to a team detail page
- **THEN** the system SHALL orchestrate rendering using a `useTeamData` hook and modular UI components (`TeamHeader`, `MemberList`)

### Requirement: Abstracted Team Data Access
All database interactions for teams MUST be abstracted into a repository layer, removing Drizzle ORM dependencies from the UI components.

#### Scenario: Updating a Team
- **WHEN** a user modifies a team member's configuration
- **THEN** the component SHALL call a repository function instead of executing a Drizzle query directly
