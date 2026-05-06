## Why

Users need a way to save and manage a collection of Pokémon they have configured (a "team"). Currently, they can configure individual Pokémon in the calculator or preset pages, but they cannot save a grouped team of up to 6 Pokémon for VGC battles, which is a core part of competitive play. This page will provide a centralized place to build, save, and review teams.

## What Changes

- Add a new "Teams" page to the application.
- Implement functionality to create a new team, add configured Pokémon to the team, and save the team to local storage (or the local database).
- Display a list of saved teams.
- Allow viewing the details of a saved team.
- Allow deleting or editing a saved team.

## Capabilities

### New Capabilities
- `team-management`: Creating, viewing, editing, and deleting a collection of up to 6 Pokémon as a saved team.

### Modified Capabilities

## Impact

- **UI/Routing**: A new route and page will be added for `/teams`. The navigation menu will be updated.
- **State/Storage**: We will need a way to store team configurations, likely referencing existing Pokémon presets or saving full data structures to IndexedDB/local DB.
- **Components**: Re-use of Pokémon display components and potentially the detailed modal.
