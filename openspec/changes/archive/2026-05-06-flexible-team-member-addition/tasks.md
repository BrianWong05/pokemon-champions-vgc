## 1. Component Refactoring

- [x] 1.1 Extract Pokémon configuration logic from `DamageCalculator` into a reusable `usePokemonEditor` hook
- [x] 1.2 Refactor `PokemonPanel` to use `usePokemonEditor` or create a new `PokemonConfigForm` component that can be used in both the calculator and the team builder

## 2. Modal and Editor UI

- [x] 2.1 Create `TeamMemberEditorModal` component that hosts the `PokemonConfigForm`
- [x] 2.2 Implement "Add Pokémon" flow in `TeamDetailPage` that uses the modal after selecting a base Pokémon via search
- [x] 2.3 Implement "Edit Pokémon" flow in `TeamDetailPage` to open the modal for existing members

## 3. Integration and Data Sync

- [x] 3.1 Update `useTeams` hook to support updating team members with full configuration objects
- [x] 3.2 Ensure nature, ability, and item selections in the editor correctly map to the database schema and storage format
- [x] 3.3 Verify that changes made in the team editor are persisted correctly to the local database
