## Context

The current team member cards lack visual representation, making it difficult for users to distinguish Pokémon at a glance.

## Goals / Non-Goals

**Goals:**
- Add Pokémon sprite/image display to team member cards.

**Non-Goals:**
- None.

## Decisions

- **Implementation**: Reuse the `PokemonImage` component already used in the application. Ensure the `id` from `member.configuration.selectedId` is passed correctly.

## Risks / Trade-offs

- **[Risk] Path Resolution** → If the `id` does not map to a sprite, `PokemonImage` handles it with a default fallback. No additional risk.
