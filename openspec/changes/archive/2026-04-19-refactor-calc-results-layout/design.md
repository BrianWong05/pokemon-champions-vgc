## Context

The Damage Calculator currently uses a vertical 3-column layout. We want to modernize this to a horizontal "dashboard" style where the outcome (results) is the most prominent element at the top, and the configuration (Pokémon) is secondary below it.

## Goals / Non-Goals

**Goals:**
- Implement a top-down layout structure using Tailwind CSS.
- Calculate and display damage results for up to 4 moves at once.
- Provide a clear, visual HP bar that updates based on the active selection.
- Simplify the Attacker move-set inputs by removing selection logic.

**Non-Goals:**
- Supporting more than 4 moves.
- Changing the underlying damage formula (standardized for Level 50).

## Decisions

- **Grid Layout**: 
    - Top Section: `col-span-full` or `w-full`.
    - Bottom Section: `grid-cols-1 md:grid-cols-2` for side-by-side Pokémon setup.
- **State Management**:
    - Keep `activeMoveIndex` in the parent `DamageCalculatorPage`.
    - `useMemo` will return an array: `results: (DamageResult | null)[]`.
- **Component Refactor**:
    - `ResultsPanel` will be completely rewritten to handle the array of results and the central HP bar.
    - `DamageCalculatorTemplate` will be updated to support the new layout slots.
- **Visuals**:
    - Selectable cards for each move.
    - HP bar using a `div` with varying width and color (green -> yellow -> red).

## Risks / Trade-offs

- **[Risk]** Result cards might overflow on small screens → **[Mitigation]** Use a flex-wrap or horizontal scroll container for the move cards on mobile.
- **[Risk]** Increased computation (4 moves instead of 1) → **[Mitigation]** The formula is lightweight; `useMemo` will handle this efficiently in the browser.
