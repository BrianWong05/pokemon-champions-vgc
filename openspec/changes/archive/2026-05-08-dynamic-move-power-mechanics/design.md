## Context

The damage calculator currently treats move power as a static attribute defined in the Pokémon Showdown data. This fails for moves like "Last Respects" which dynamically scale power based on fainted team members.

## Goals / Non-Goals

**Goals:**
- Implement a power modifier pipeline that allows dynamic adjustment of base power.
- Update the calculation workflow to fetch the current modifier before calculating damage.

**Non-Goals:**
- Implementing every dynamic-power move in the game.
- Dynamically tracking the fainted status of team members in real-time battle; for the calculator, we'll need a way for the user to specify this state.

## Decisions

### 1. New Power Modifier Interface
Add a `getMovePowerModifier(moveName, battleState)` function to `src/utils/damage.ts`.
- `battleState` will encapsulate dynamic factors (e.g., fainted count).

### 2. Integration into Calculation Workflow
Before `calculateSmogonDamage`, we'll check if the move has a dynamic component. If so, we'll manually apply the power multiplier by creating a custom `Move` instance with the modified power.

## Risks / Trade-offs

- **Risk**: Over-complicating the calculator UI to track fainted team members.
- **Mitigation**: Add a simple input field in the calculator's 'Field Effects' or a dedicated 'Battle State' panel to allow the user to define how many Pokémon have fainted.
