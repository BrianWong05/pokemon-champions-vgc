## Context

The "My Teams" page displays team members in a 2x3 grid. Currently, both the `PokemonImage` and `ItemImage` within each grid cell are sized at `w-6 h-6`. The user wants to enlarge only the Pokémon images while keeping the grid layout, item images, and card side unchanged.

## Goals / Non-Goals

**Goals:**
- Increase the size of Pokémon images in the team overview card.
- Maintain the 2x3 grid structure.
- Keep `ItemImage` size as is (`w-6 h-6`).
- Keep the overall card dimensions the same.

**Non-Goals:**
- Enlarging item images.
- Changing the grid count (staying at 2x3).

## Decisions

### 1. New Pokémon Image Dimensions
We will increase the size of `PokemonImage` from `w-6 h-6` (24px) to `w-10 h-10` (40px).

- **Rationale**: `w-10` makes the Pokémon more recognizable without crowding the item icon.
- **Alternatives**: `w-12` might start competing too much with the item icon space.

### 2. Spacing Adjustments
We will maintain the `gap-1` or `gap-2` between the Pokémon and item icon.

## Risks / Trade-offs

- **[Risk]** Visual imbalance between large Pokémon and small item.
- **[Mitigation]** The Pokémon is the primary subject, so it being larger is naturally hierarchical.
