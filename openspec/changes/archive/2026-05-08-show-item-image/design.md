## Context

The "My Teams" page (`src/pages/Teams/index.tsx`) currently displays a list of saved teams. Each team card shows up to 6 Pokémon members. For each member, it displays the Pokémon's thumbnail image and the name of its held item as a truncated text string. This text display is often cut off (e.g., "Choice ..." or "Charizar...") and lacks the visual clarity provided by item sprites.

## Goals / Non-Goals

**Goals:**
- Replace the truncated item name text with the `ItemImage` component in `src/pages/Teams/index.tsx`.
- Improve the visual quality and readability of the team overview cards.
- Maintain the ability to see the item name via a tooltip.

**Non-Goals:**
- Changes to the team editing logic.
- Changes to the Pokémon image display.
- Adding new item assets (assuming existing assets are sufficient).

## Decisions

### 1. Component Replacement
We will replace the `<span>` showing `member.configuration.item` with the `<ItemImage>` component.

- **Rationale**: `ItemImage` already encapsulates the logic for resolving item names to image paths and handling fallbacks.
- **Alternatives**: Manually mapping item names in `TeamsPage`, but this would duplicate logic and be harder to maintain.

### 2. Styling and Tooltip
The `ItemImage` will be styled with `w-6 h-6` (matching the `PokemonImage`) and will include a `title` attribute for the item name.

- **Rationale**: Keeping icons the same size maintains a clean, balanced grid. Using the `title` attribute is a simple way to provide tooltips without adding complex UI dependencies.

## Risks / Trade-offs

- **[Risk]** Missing item images.
- **[Mitigation]** `ItemImage` already has a fallback (a "?" placeholder) for missing assets. We will ensure the fallback looks acceptable in the small grid.

- **[Trade-off]** Space constraints.
- **[Mitigation]** The `ItemImage` is compact. Replacing text with an icon actually saves space and reduces truncation issues.
