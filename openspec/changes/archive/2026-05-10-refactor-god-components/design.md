## Context

The current architecture suffers from "God Components" that bundle data fetching, state management, and multi-layered UI. This leads to high cognitive load and fragile code. Specifically, `TeamDetail` (638 lines) and `PokemonConfigForm` (363 lines) are the primary targets for decomposition.

## Goals / Non-Goals

**Goals:**
- **Modularization**: Break down files > 300 lines into smaller atoms, molecules, and organisms.
- **Concern Separation**: Move Drizzle queries to a repository layer and complex state to custom hooks.
- **Standardization**: Implement a consistent "Feature-based" structure for complex domains like Teams and Calculator.
- **Testability**: Enable unit testing for isolated logic components.

**Non-Goals:**
- Changing existing features or adding new Pokémon data.
- Rewriting the CSS/styling system (keep Tailwind/Vanilla as is).
- Implementing a global state manager (Redux/Zustand) unless absolutely necessary.

## Decisions

### 1. Domain-Driven Feature Folders
**Decision**: Migrate logic from `src/pages/` and `src/components/organisms/` to `src/features/`.
- **Rationale**: Pages should only be layout containers and route handlers. Organizations should be pure UI. Domain-specific logic belongs in features.
- **Structure**:
  - `src/features/teams/`: Repository, Hooks, Components (MemberCard, TeamHeader).
  - `src/features/calculator/`: StatEngine, MoveSelector, FieldConfig.

### 2. Custom Hook Decomposition
**Decision**: Split `usePokemonEditor` and `useCalculatorState` into functional primitives.
- **Rationale**: Composable hooks allow for better reuse and isolation.
- **New Hooks**:
  - `useStatCalculation`: Purely for HP/Stat/Nature math.
  - `usePokemonForm`: Handle input changes and validation.
  - `useDamageResults`: Orchestrate the `calculateSmogonDamage` utility.

### 3. Data Access Layer (Repository Pattern)
**Decision**: Move all Drizzle ORM calls from `useEffect` into repository functions.
- **Rationale**: Decouples UI from the database schema and simplifies testing with mocks.
- **New File**: `src/db/repositories/pokemon.repo.ts`.

### 4. Component Composition over Prop Drilling
**Decision**: Use React Composition and specialized sub-components for `PokemonConfigForm`.
- **Rationale**: Instead of passing 27 props to one component, pass smaller sets to `StatSection`, `MoveSection`, etc.

## Risks / Trade-offs

- **[Risk]**: Regressions in damage calculation logic during hook refactoring.
  - **Mitigation**: Ensure `src/utils/damage-calc/` has 100% test coverage before refactoring hooks.
- **[Risk]**: Increased file count and navigation complexity.
  - **Mitigation**: Use strict naming conventions and directory indexing (`index.ts`).
