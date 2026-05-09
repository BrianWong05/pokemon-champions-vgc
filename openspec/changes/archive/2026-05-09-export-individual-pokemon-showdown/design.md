## Context

The `TeamDetailPage` recently received a team-wide export feature. Users now want to export individual Pokémon sets.

## Goals / Non-Goals

**Goals:**
- Add an "Export" button to the footer of each Pokémon card in `TeamDetailPage`.
- Reuse `formatShowdownSet` from `src/utils/showdown-formatter.ts`.
- Implement a temporary "Copied!" state for the button to provide feedback.

**Non-Goals:**
- Creating a separate modal for individual export (inline copy is preferred for speed).

## Decisions

- **UI Integration:** The "Export" button will be placed in the card footer next to "Edit" and "Remove".
- **Feedback Mechanism:** Use a local state (or a timed boolean) in the card rendering loop (or a sub-component if extracted) to change the button text to "Copied!" for 2 seconds after a successful copy.
- **Data Access:** Since the `TeamDetailPage` already has the `pokemonList` and the `team.members` data, we have everything needed to call `formatShowdownSet`.

## Risks / Trade-offs

- **Footer Clutter:** Adding a third button to the footer might make it cramped on smaller screens.
    - [Mitigation] Use concise labels or icons if necessary, but "Export" should fit given the current design.
