## Context

The "My Teams" page currently displays team members in a flexbox container with `flex-wrap`. This works for dynamic member counts but results in an inconsistent visual structure when teams have 4, 5, or 6 members, as the last row may be incomplete.

## Goals / Non-Goals

**Goals:**
- Implement a rigid 2x3 grid layout for team member slots in the team overview card.
- Ensure the layout is visually balanced even if a team has fewer than 6 members (by maintaining empty slots if needed, or simply ensuring the grid structure is respected).

**Non-Goals:**
- Modifying the contents of the member slots (Pokémon image and item image).
- Changing the overall card layout beyond the member grid.

## Decisions

### 1. CSS Grid Implementation
We will use Tailwind's `grid grid-cols-3` on the container.

- **Rationale**: This is the most direct way to achieve a 3-column layout. With 6 items, it will automatically wrap into 2 rows.
- **Alternatives**: Using `flex-basis: 33.33%` on children, but `grid` is cleaner and easier to manage gaps with.

### 2. Gap and Padding
We will maintain a `gap-2` to keep spacing consistent with the existing design.

## Risks / Trade-offs

- **[Risk]** Very small screen widths might cause the 3-column grid to feel cramped.
- **[Mitigation]** The icons are small (`w-6`), so 3 columns plus gaps should easily fit within the card even on mobile.
