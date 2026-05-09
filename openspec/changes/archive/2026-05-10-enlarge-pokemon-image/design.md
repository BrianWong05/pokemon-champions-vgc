## Context

The `PokemonImage` component currently defaults to `w-10 h-10` (40px x 40px). This is too small for many UI contexts, especially the newly compacted grid cards in the Speed Tier List, which could accommodate larger, more detailed images.

## Goals / Non-Goals

**Goals:**
- Update `PokemonImage` to support a larger default size (e.g., `w-16 h-16` or 64px x 64px).
- Maintain the `className` prop to allow overrides in specific components if needed.
- Ensure existing components using `PokemonImage` don't break with the new sizing.

**Non-Goals:**
- Replacing the sprite assets.

## Decisions

### 1. Default Size Update
We will change the default `className` in `PokemonImage` from `w-10 h-10` to `w-16 h-16`.

**Rationale**: This provides a noticeable improvement in size (from 40px to 64px) while still being reasonable for most list and card views.

### 2. Flexible Props
We will ensure that components explicitly passing a `className` to `PokemonImage` continue to work as expected, as the `className` prop will still override the default.

## Risks / Trade-offs

- **[Risk]** Larger images might break existing layouts. → **[Mitigation]** We will check primary views (Speed Tier List, Detail Modals) and adjust their layout if the new size creates overflow or alignment issues.
