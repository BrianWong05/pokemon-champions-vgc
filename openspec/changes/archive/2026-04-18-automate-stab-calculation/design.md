## Context

The damage calculator currently treats STAB as a binary manual choice. A more advanced implementation should derive STAB from the attacker's Pokémon types and the move's type.

## Goals / Non-Goals

**Goals:**
- Add `moveType` to the calculator's state.
- Fetch and store Pokémon types in the `attacker` and `defender` state.
- Automatically set STAB multiplier to 1.5 if `moveType` matches `attacker.type1` or `attacker.type2`.
- Provide a visual indicator for STAB.

**Non-Goals:**
- Implementing "Protean" or "Libero" style type-changing abilities (out of scope for now).
- Automatic type-effectiveness calculation (will remain a manual selector for now, to be automated in a separate change).

## Decisions

- **State Schema Update**: Add `type1` and `type2` to the `SideState` interface in `DamageCalculator/index.tsx`.
- **Move Type Selector**: Add a dropdown to `AttackerPanel` allowing the user to select from the 18 Pokémon types.
- **Automated Logic**: Move STAB calculation into the `useMemo` block in the page component. The manual `isStab` boolean will be removed from the state or transformed into an auto-computed value.
- **UI Feedback**: Instead of a checkbox, show a "STAB" badge next to the damage results when applicable.

## Risks / Trade-offs

- **[Risk]** Complexity of dual-type matching → **[Mitigation]** Simple logical OR match: `isStab = (moveType === type1 || moveType === type2)`.
- **[Risk]** Outdated database fetch → **[Mitigation]** Ensure the `fetchPokemon` query includes `type1` and `type2` columns.
