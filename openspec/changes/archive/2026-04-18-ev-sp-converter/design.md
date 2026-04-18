## Context

The project already uses Atomic Design for the Speed Tier List. We will extend this pattern to the new EV/SP converter to maintain consistency.

## Goals / Non-Goals

**Goals:**
- Implement the `floor((EV + 4) / 8)` conversion formula.
- Build a responsive, 6-stat input form.
- Real-time calculation and validation of VGC constraints (510 total EVs).
- Clear visualization of the results.

**Non-Goals:**
- Saving user-defined spreads to a database (initial version is local-only).
- Exporting to external formats like Showdown (can be a future task).

## Decisions

- **Atomic Structure**:
    - **Atoms**: `StatInput` (number field), `Badge` (SP display), `ProgressBar` (for total counters).
    - **Molecules**: `StatRow` (Label + StatInput + Badge).
    - **Organisms**: `StatForm` (Group of 6 StatRows + Summary footer).
    - **Templates**: `MainLayout` (already exists or simple layout).
    - **Pages**: `EvSpConverterPage` (State management).
- **State Management**: Use a single object state `{ hp: 0, atk: 0, ... }` in the Page component and pass change handlers down.
- **Styling**: Use Tailwind CSS for a modern, dark-themed or clean UI with visual feedback for overflow (e.g., red text for > 510 EVs).

## Risks / Trade-offs

- **[Risk]** Mathematical errors in conversion → **[Mitigation]** Unit tests for the conversion utility function.
- **[Risk]** UI clutter on mobile → **[Mitigation]** Use a vertical stack for rows and ensuring input targets are large enough for touch.
