## Context

Currently, the damage calculator uses `@smogon/calc` under the hood to perform calculations. However, the user interface and our wrapper logic do not provide a way to select or pass a "hold item" (e.g., Choice Band, Life Orb) to the calculation engine. Hold items are a fundamental mechanic in competitive Pokémon (VGC) and significantly alter damage output, speed tiers, and bulk.

## Goals / Non-Goals

**Goals:**
- Add a dropdown or autocomplete input in the UI to select a Pokémon's hold item.
- Plumb the selected item down to the `@smogon/calc` engine via our calculation utilities.
- Ensure the calculator reactively updates when the item changes.
- Ensure that item choices persist along with other Pokémon state (like nature, EVs).

**Non-Goals:**
- We will not implement custom item logic; we will rely entirely on `@smogon/calc`'s existing item support.
- We will not filter items by format legality yet (we will show all items supported by `@smogon/calc`).

## Decisions

- **UI Placement**: Place the item selection dropdown right below or next to the Pokémon Name / Ability selection in the Attacker and Defender panels.
  - *Rationale*: It logically groups with intrinsic Pokémon properties.
- **State Management**: The `item` property will be added to the base Pokémon state object used by the application, so that modifying it triggers a re-render of the damage results automatically.
  - *Rationale*: Fits seamlessly into our existing reactive pipeline.
- **Integration with `@smogon/calc`**: We will pass the `item` string directly to the `Pokemon` constructor from `@smogon/calc`.
  - *Rationale*: The library already knows how to apply Life Orb, Choice Band, etc. No need to reinvent the wheel.

## Risks / Trade-offs

- [Risk] `@smogon/calc` might have a specific, typed list of item names that differs slightly from our UI's underlying strings.
  - *Mitigation*: We will use the exported `ItemName` type or list from `@smogon/calc` to populate our dropdown options, ensuring exact string matches.