## Context

The user wants a detailed Pokémon popup triggered by clicking a list item. This requires a new component hierarchy and an efficient way to fetch related Pokémon forms.

## Goals / Non-Goals

**Goals:**
- Display all 6 base stats in a visually appealing way (e.g., bar chart or grid).
- Show the Pokémon's types.
- List related forms (base form, regional variants, and Megas).
- Ensure the modal is responsive and accessible.

**Non-Goals:**
- Editing stats within the modal.
- External links to Pokémon databases (keep info local).

## Decisions

- **State Management**: Use `useState` in `SpeedTierPage` to track the `selectedPokemonId`. If null, the modal is closed.
- **Data Fetching**:
    - When a Pokémon is selected, execute a query in `src/pages/SpeedTierList/index.tsx` (or a custom hook).
    - To find "other forms," we will query the `pokemon` table for records that share the same `speciesId` (if available) or use a naming/identifier-based fuzzy search if the schema lacks a species grouping column.
- **Component Breakdown**:
    - **Atom**: `StatBar` (visual representation of a stat value).
    - **Molecule**: `FormItem` (small image + name of an alternate form).
    - **Organism**: `PokemonDetailModal` (combines header, types, stats, and form items).
- **Styling**: Use a semi-transparent backdrop and a centered white/dark-themed container for the modal.

## Risks / Trade-offs

- **[Risk]** Large queries for forms → **[Mitigation]** Form queries will be lazy-loaded only when the modal opens.
- **[Risk]** Inconsistent form data → **[Mitigation]** The database was recently updated with regional forms and Megas, so matching by base name or ID should be reliable.
