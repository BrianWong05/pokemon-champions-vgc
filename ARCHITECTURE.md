# Project Architecture

## Directory Structure

This project follows a hybrid of **Atomic Design** and **Domain-Driven Feature Folders**.

### Core Directories

- `src/features/`: Contains domain-specific logic, components, hooks, and utils.
  - `damage-calculator/`: Logic and UI for the damage calculator feature.
  - `pokemon/`: Shared Pokémon domain logic (stats, types, presets).
  - `teams/`: Team management logic and UI.
- `src/components/`: Shared UI components following Atomic Design.
  - `atoms/`: Base primitives (Badge, Button, Modal, etc.).
  - `molecules/`: Composite components with internal state or domain coupling (StatInput, StatSlider, SearchSelect).
  - `organisms/`: Complex UI blocks (PokemonPanel, ResultsPanel).
  - `templates/`: Layout wrappers.
- `src/hooks/`: Truly generic, global hooks (e.g., `useModalRegistry`).
- `src/db/`: Database layer (Drizzle schema and repositories).
- `src/pages/`: Page entry points. Pages should be thin wrappers around feature templates/organisms.

### Standards

- **Absolute Imports**: Always use the `@/` alias for internal imports.
- **Domain Separation**: Prefer placing logic within `src/features/` over global `hooks/` or `utils/` if it is domain-specific.
- **Atomic Boundaries**: Atoms must be simple. If a component has business logic or composites multiple interactive elements, it should be a Molecule.
