## Context

The current team detail view displays only basic information for team members, requiring users to open the editor to see detailed stats. We want to display these stats directly on the member cards.

## Goals / Non-Goals

**Goals:**
- Add base stat and SP investment visualization to each member card in `TeamDetailPage`.
- Maintain a clean card UI while presenting complex stat data compactly.

**Non-Goals:**
- Moving the stat calculation logic to the database (we will continue to compute stats on the client).

## Decisions

- **Stat Display Format**: Use a compact table or row-based layout (HP, Atk, Def, SpA, SpD, Spe) displaying base and invested SP.
- **Component Placement**: Integrate the stat visualization directly beneath the basic member info (Item/Ability/Nature) on the card, without over-cluttering.

## Risks / Trade-offs

- **[Risk] Card Height** → Adding stat rows might make cards too tall. Mitigation: Use a very compact font and minimal vertical padding to ensure it fits well in the grid layout.
