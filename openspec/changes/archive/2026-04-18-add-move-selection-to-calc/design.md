## Context

The Damage Calculator now has access to Pokémon, moves, and their relationships. We need to leverage this data to provide a more guided experience where move choices are restricted to what a Pokémon can actually learn, and move stats are loaded automatically.

## Goals / Non-Goals

**Goals:**
- Dynamically fetch moves when an Attacker is selected.
- Automatically determine move category (Physical/Special) and power.
- Automatically calculate STAB.
- Correctly map move category to the appropriate offensive and defensive stats.

**Non-Goals:**
- Implementing damage for multi-hit moves or complex side effects (Level 50 standard damage only).
- Automatic type effectiveness calculation (remains automated from a previous change).

## Decisions

- **Data Fetching**: Use a `useEffect` in `DamageCalculatorPage` that watches `state.attacker.selectedId`. When it changes, fetch moves from `pokemon_moves` joined with `moves`.
- **Stat Selection Logic**:
    - If `moveCategory === 'special'`, damage logic uses `attacker.spa` and `defender.spd`.
    - If `moveCategory === 'physical'`, damage logic uses `attacker.atk` and `defender.def`.
- **STAB Determination**: `isStab = (moveTypeId === attacker.type1Id || moveTypeId === attacker.type2Id)`.
- **UI Element**: Reuse the searchable select pattern from `PokemonSearchSelect` to create a `MoveSearchSelect` component.

## Risks / Trade-offs

- **[Risk]** Large move-sets causing UI lag → **[Mitigation]** We are already filtering `pokemon_moves` to level-up, TM, and tutor moves, which keeps the list size manageable (usually < 100 per Pokémon).
- **[Risk]** Move data discrepancies → **[Mitigation]** The database is populated from the PokeAPI master branch, ensuring high data reliability.
