## Context

The current `SpeedTierList` component combines data fetching, grouping logic, and complex UI rendering in a single file. This design outlines how to break this down using Atomic Design.

## Goals / Non-Goals

**Goals:**
- Separate presentation from data fetching.
- Create reusable Atomic components (Atoms, Molecules, Organisms).
- Standardize Tailwind CSS usage across levels.
- Ensure type-safe prop passing.

**Non-Goals:**
- Changing existing styling or functionality.
- Adding new features like filters or search (though the new structure will make them easier to add later).

## Decisions

- **Hierarchy**:
    - **Atoms**: `Typography` (headings/text), `PokemonImage` (thumbnail), `StatValue` (the benchmark number).
    - **Molecules**: `StatGridItem` (Pokemon image + benchmarks), `TierHeader` (Base X title).
    - **Organisms**: `TierSection` (TierHeader + list of StatGridItems).
    - **Templates**: `SpeedTierTemplate` (Main container and header layout).
    - **Pages**: `SpeedTierPage` (Fetches data via `getDb` and passes it to the template).
- **Location**:
    - Components will live in `src/components/{atoms|molecules|organisms|templates}/`.
    - Pages will stay in `src/pages/`.
- **Props**: Every component will have a clearly defined interface in its file.

## Risks / Trade-offs

- **[Risk]** Over-engineering for a simple list → **[Mitigation]** While it adds files, it establishes a pattern that makes adding complex features (like team building) much more manageable.
- **[Risk]** Prop drilling → **[Mitigation]** The hierarchy is shallow enough (Page -> Template -> Organism -> Molecule -> Atom) that drilling is manageable, or context can be used if it grows deeper.
