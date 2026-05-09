## 1. Data Access Layer

- [x] 1.1 Create `src/db/repositories/team.repo.ts` to centralize team fetching and updates.
- [x] 1.2 Create `src/db/repositories/pokemon.repo.ts` for Pokémon and move metadata fetching.

## 2. Core Hook Refactoring

- [x] 2.1 Extract stat calculation logic from `usePokemonEditor` into a pure `useStatEngine` hook.
- [x] 2.2 Split `useCalculatorState` reducer into `fieldReducer` and `sideReducer`.
- [x] 2.3 Create `useModalRegistry` to manage multiple modal states in pages.

## 3. Atomic UI Refactoring

- [x] 3.1 Break `PokemonConfigForm` into `StatSection`, `MoveSection`, and `MetadataSection`.
- [x] 3.2 Refactor `StatGrid` molecule if it contains too much internal logic.
- [x] 3.3 Create a `PokemonConfigProvider` if prop drilling remains an issue after decomposition.

## 4. Page Decomposition

- [x] 4.1 Decompose `TeamDetail/index.tsx` into `features/teams/components/TeamHeader`.
- [x] 4.2 Move member listing to `features/teams/components/TeamMemberGrid`.
- [x] 4.3 Implement `useTeamDetail` hook to orchestrate fetching and modal management.
