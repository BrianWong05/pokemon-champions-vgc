## Context

The damage calculator and the team builder both use the same `PokemonConfig` interface (defined in `src/hooks/usePokemonEditor.ts`) to represent a Pokémon's stats, moves, item, and ability. Saved teams store these configurations in a SQLite database, exposed via the `useTeams` hook.

Currently, the calculator only supports Smogon presets or manual entry. This design bridges the two features by allowing users to import their own team configurations directly into the calculator.

## Goals / Non-Goals

**Goals:**
- Add a "My Team" import option to the calculator panels.
- Allow selecting from saved teams and their members.
- Reuse the existing `PokemonConfig` state management to minimize complexity.

**Non-Goals:**
- Syncing changes from the calculator back to the team.
- Supporting team selection on mobile (out of scope for this phase, focus on desktop).

## Decisions

### 1. UI Entry Point: "My Teams" Toggle
In the `InteractiveDamageCalculator` component, we will add a new tab or toggle next to "Presets" called "My Teams". 
- **Rationale**: Keeps the selection methods grouped together.

### 2. Team Member Selection Interface
When "My Teams" is active, a two-step selection will appear:
1. A dropdown to select the Team.
2. A grid of the 6 Pokémon in that team (showing species name and icon/sprite).
- **Rationale**: Users can quickly identify their Pokémon by visual cues.

### 3. Data Integration: `loadConfig`
Since `TeamMember.configuration` is already a `PokemonConfig` object, we can directly use the `loadConfig` method from `usePokemonEditor` to update the calculator panel's state.
- **Rationale**: Zero-transformation overhead and guaranteed compatibility.

### 4. Component Structure
We will create a new component `TeamImportSelector` that takes the `loadConfig` function as a prop and handles its own fetching of teams via `useTeams`.
- **Rationale**: Decouples the import UI from the main calculator layout.

## Risks / Trade-offs

- **Risk**: User has no teams saved.
- **Mitigation**: Display a friendly message with a link to the Team Builder if the `teams` array is empty.

- **Risk**: Performance with many teams.
- **Mitigation**: `useTeams` already handles fetching; we'll ensure the selector only renders when the tab is active.
