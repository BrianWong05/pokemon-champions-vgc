## 1. Database Setup

- [x] 1.1 Create Drizzle schema for `teams` and `team_members` tables in `src/db/schema.ts`
- [x] 1.2 Generate and apply Drizzle migrations for the new tables

## 2. State and Service Hooks

- [x] 2.1 Implement `useTeams` hook with methods for fetching, creating, updating, and deleting teams
- [x] 2.2 Implement logic to fetch team members when fetching a team

## 3. UI Implementation - Routing and Shell

- [x] 3.1 Add `/teams` and `/teams/:id` routes in the application router
- [x] 3.2 Update application navigation to include a link to the "Teams" page

## 4. UI Implementation - Teams Page

- [x] 4.1 Create `TeamsPage` component to list all saved teams
- [x] 4.2 Add "Create New Team" button and functionality to `TeamsPage`
- [x] 4.3 Add "Delete Team" button to each team card/list item

## 5. UI Implementation - Team Detail Page

- [x] 5.1 Create `TeamDetailPage` component to show the members of a specific team
- [x] 5.2 Implement UI to add a Pokémon to the team (up to 6 members)
- [x] 5.3 Implement UI to remove a Pokémon from the team
- [x] 5.4 Ensure visual indicators show remaining team slots (out of 6)
