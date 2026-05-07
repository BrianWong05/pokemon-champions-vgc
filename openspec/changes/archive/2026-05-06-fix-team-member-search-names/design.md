## Context

The `PokemonSearchSelect` component is used for selecting Pokémon to add to a team in the `TeamDetailPage`. Users report that the dropdown options are empty, preventing them from identifying Pokémon during search.

## Goals / Non-Goals

**Goals:**
- Fix the rendering of Pokémon names in the `PokemonSearchSelect` search results.

**Non-Goals:**
- None.

## Decisions

- **Investigation**: Check `PokemonSearchSelect.tsx` and ensure that it is correctly mapping the `pokemonList` items to the expected display name property.

## Risks / Trade-offs

- **[Risk] None identified.**
