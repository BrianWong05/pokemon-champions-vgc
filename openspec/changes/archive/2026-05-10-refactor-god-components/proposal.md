## Why

The codebase has accumulated several "God Components" and "God Pages" (notably `TeamDetail` and `PokemonConfigForm`) that exceed 300+ lines and mix concerns such as direct database access (Drizzle ORM), complex state management, multiple modals, and large UI trees. This violates the Single Responsibility Principle and Atomic Design, leading to high maintenance costs, poor testability, and a "Prop Drilling" hell.

## What Changes

- **Refactor `TeamDetail` Page**: Decompose the 600+ line `src/pages/TeamDetail/index.tsx` into specialized sub-components (Header, MemberList, MemberCard) and custom hooks (`useTeamData`, `useTeamModals`).
- **Decompose `PokemonConfigForm`**: Split the 360+ line organism into smaller, focused molecules (StatSection, MoveSection, MetaSection) to eliminate the 27-prop interface.
- **Hook Modularization**: Break down `usePokemonEditor.ts` and `useCalculatorState.ts` into smaller, composable hooks (e.g., `useStats`, `useNature`, `useFieldState`).
- **Logic Abstraction**: Move Drizzle query logic from components into pure utility services or repository patterns.

## Capabilities

### New Capabilities
- `team-management`: Modular architecture for team CRUD and detail view.
- `calc-config-engine`: Decoupled state and UI for Pokémon configuration.

### Modified Capabilities
<!-- No existing spec requirements are changing; this is an architectural refactor. -->

## Impact

- `src/pages/TeamDetail/index.tsx`: Total rewrite/decomposition.
- `src/components/organisms/PokemonConfigForm.tsx`: Significant refactor into smaller components.
- `src/hooks/usePokemonEditor.ts`: Refactor into multiple smaller hooks.
- `src/pages/DamageCalculator/hooks/useCalculatorState.ts`: Refactor into multiple reducers/hooks.
- `src/db/`: Potential introduction of data access layer to abstract Drizzle from UI.
