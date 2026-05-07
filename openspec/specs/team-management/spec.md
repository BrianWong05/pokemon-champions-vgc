# Team Management

## Purpose
Define the capabilities for creating, saving, editing, and deleting collections of up to 6 configured Pokémon as a team for VGC battles.

## Requirements

### Requirement: Team Creation and Storage
The system SHALL allow users to create and save a new team of Pokémon.

#### Scenario: Creating an empty team
- **WHEN** the user navigates to the Teams page and clicks "Create Team"
- **THEN** a new team is initialized with a default name (e.g., "New Team") and an empty list of members.

#### Scenario: Saving a team
- **WHEN** the user provides a name and saves the team
- **THEN** the team is persisted to local storage and appears in the list of saved teams.

### Requirement: Adding Members to a Team
The system SHALL allow users to add up to 6 configured Pokémon to a team.

#### Scenario: Adding a Pokémon
- **WHEN** the user selects a configured Pokémon to add to a team with fewer than 6 members
- **THEN** the Pokémon is added to the team's member list.

#### Scenario: Adding to a full team
- **WHEN** the user attempts to add a Pokémon to a team that already has 6 members
- **THEN** the system prevents the addition and displays an error message or disabled state.

### Requirement: Editing and Removing Team Members
The system SHALL allow users to manage the members of a saved team.

#### Scenario: Removing a member
- **WHEN** the user clicks "Remove" on a Pokémon in the team view
- **THEN** the Pokémon is removed from the team and the updated team is saved.

### Requirement: Deleting a Team
The system SHALL allow users to delete an entire saved team.

#### Scenario: Deleting a saved team
- **WHEN** the user clicks "Delete" on a saved team and confirms the action
- **THEN** the team is permanently removed from storage and the UI.

### Requirement: Item Image Rendering
The `ItemImage` component SHALL render the correct image for a given item name.

#### Scenario: Displaying item image in team view
- **WHEN** a team member card is displayed
- **THEN** the `ItemImage` component successfully loads and displays the image corresponding to the member's item.
