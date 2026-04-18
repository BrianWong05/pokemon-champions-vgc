## Context

The current `PokemonDetailModal` uses hardcoded gray background colors for Pokémon types. We need a systematic way to map each Pokémon type to its corresponding SVG icon and color.

## Goals / Non-Goals

**Goals:**
- Centralize Pokémon type metadata (icons and colors).
- Create a reusable `TypeBadge` component.
- Support both single and dual-type Pokémon.

**Non-Goals:**
- Changing the layout of the `PokemonDetailModal` header beyond the badges themselves.

## Decisions

- **Color Mapping**: We will define a `TYPE_METADATA` object in `src/utils/pokemon-types.ts` that contains:
    - bug: #9f9f28
    - dark: #4f4747
    - dragon: #576fbc
    - electric: #dfbc28
    - fairy: #e18ce1
    - fighting: #e49021
    - fire: #e4613e
    - flying: #74aad0
    - ghost: #6f4570
    - grass: #439837
    - ground: #a4733c
    - ice: #47c8c8
    - normal: #828282
    - poison: #9354cb
    - psychic: #e96c8c
    - rock: #a9a481
    - steel: #77b2cb
    - water: #3a9de2
- **Icon Loading**: Use dynamic imports or a manual mapping in a `TypeIcon` component to load SVGs from `@icons/`.
- **Badge Design**: A rounded pill-shaped badge containing the SVG and the type name in white text.

## Risks / Trade-offs

- **[Risk]** Large bundle size with 18 SVGs → **[Mitigation]** The SVGs are small (simple paths) and will likely be inlined by Vite during build, resulting in minimal impact.
