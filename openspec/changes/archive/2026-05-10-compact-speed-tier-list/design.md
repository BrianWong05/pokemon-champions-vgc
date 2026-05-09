## Context

The current `SpeedTierList` displays Pokémon in a vertical table-like structure using `StatGridItem`. While functional, it consumes significant vertical space, especially in tiers with many Pokémon (like Base 100). The user has requested a "compact" view to increase information density.

## Goals / Non-Goals

**Goals:**
- Implement a grid-based layout for Pokémon within each tier.
- Reduce the vertical height of individual Pokémon entries.
- Maintain clear visibility of the three primary speed benchmarks (Max+, Max, Min-).
- Preserve the existing "Base Speed" headers.

**Non-Goals:**
- Changing the underlying data fetching or stat calculation logic.
- Removing any existing information (name, image, benchmarks).

## Decisions

### 1. Grid vs. Table
We will move away from the current `grid-cols-12` row structure inside `TierSection` and instead use a standard Tailwind `grid` with `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.

**Rationale**: A grid allows for much better utilization of horizontal space on desktop while naturally stacking on mobile.

### 2. Card-based `StatGridItem` Refactor
The `StatGridItem` will be refactored into a "compact card". 
- Pokémon Image and Name will be at the top or side.
- Benchmarks will be displayed in a compact sub-grid or row within the card.
- Padding will be significantly reduced (e.g., from `py-4` to `p-2`).

### 3. Removal of Explicit Column Headers
In the grid view, explicit "Pokemon", "Base", "Max+", etc. headers at the top of every section become redundant and difficult to align. We will remove them in favor of intrinsic labeling or a single legend at the top of the page.

### 4. Color Coding Retention
We will continue to use the established color coding for speed values (Red for Max+, Orange for Max, Blue for Min-) to ensure users can still scan the values intuitively.

## Risks / Trade-offs

- **[Risk]** The layout might feel cluttered if cards are too small. → **[Mitigation]** Use subtle borders and consistent spacing to maintain separation.
- **[Risk]** Long names might overflow. → **[Mitigation]** Use CSS truncation and ensure cards have a minimum width.
