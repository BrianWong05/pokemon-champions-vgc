## Context

The user wants a Damage Calculator that mimics the professional look of Pikalytics or Pokémon Showdown. This requires moving away from individual card-based stat controls to a cohesive grid system.

## Goals / Non-Goals

**Goals:**
- Implement a 4-column stat row: [Label] [Base] [SP (Stat Points)] [Total].
- Display total SP consumed at the bottom of the grid.
- Integrate type badges into the Pokémon selection header.
- Ensure the layout remains responsive while becoming more compact.

**Non-Goals:**
- Changing the underlying calculation formulas.
- Implementing move selection logic (refactor is focused on UI layout).

## Decisions

- **Stat Grid**: `StatControlGroup` will be refactored to use a CSS grid with specific column widths to ensure alignment across all 6 stats.
- **Header Refactor**: The Pokémon selection area in `AttackerPanel` and `DefenderPanel` will be updated to show the Pokémon name, thumbnail, and type badges in a single cohesive header block.
- **Totals Row**: A new totals row will be added to the bottom of the stat grid to track the 66 SP limit.
- **Nature Selection**: Nature will remain a separate dropdown but will be styled to fit tighter within the layout.

## Risks / Trade-offs

- **[Risk]** Data overcrowding on mobile → **[Mitigation]** On mobile, the "Total" stat might be hidden or moved to a second line to ensure the Base and SP inputs remain usable.
- **[Risk]** Alignment issues → **[Mitigation]** Use explicit grid-cols and fixed widths for labels to ensure headers and rows line up perfectly.
