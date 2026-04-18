## Context

The user wants to see the "Base Speed" stat in every row of the Speed Tier List. The current 12-column grid layout is fully utilized, so we need to adjust the column spans to fit the new stat.

## Goals / Non-Goals

**Goals:**
- Add a "Base" column to the speed tier grid.
- Display the `baseSpeed` value for each Pokémon.
- Ensure the layout remains responsive and aligned across the header and rows.

**Non-Goals:**
- Changing the existing stat benchmark values.
- Introducing new data fetching logic (the data is already present in the existing data structure).

## Decisions

- **Grid Layout Refactor**:
    - **Pokemon Name**: Reduce from `col-span-4 lg:col-span-5` to `col-span-3 lg:col-span-4`.
    - **Base Stat (New)**: Add as `col-span-1 lg:col-span-1` text-center.
    - **Benchmarks (Max+, Max, Neutral, Min-)**: Keep their current spans if possible, or reduce Pokemon name span further to ensure they fit.
    - Final Proposed Layout:
        - Pokemon: `col-span-3 lg:col-span-4`
        - Base: `col-span-1 lg:col-span-1`
        - Max+: `col-span-2`
        - Max: `col-span-2`
        - Neutral: `col-span-2`
        - Min-: `col-span-2 lg:col-span-1`
    - Total check: 4 + 1 + 2 + 2 + 2 + 1 = 12 (lg), 3 + 1 + 2 + 2 + 2 + 2 = 12 (default). Correct.

- **Prop Propagation**: 
    - `StatGridItem` already has access to the full Pokémon object in some contexts, but its `StatGridItemProps` interface needs to be explicitly updated to include `baseSpeed`.

## Risks / Trade-offs

- **[Risk]** Pokemon name truncation → **[Mitigation]** The reduction in column span for the name is minimal, but we will monitor for long names like "Urshifu Rapid Strike" and use `truncate` or adjust font size if needed.
