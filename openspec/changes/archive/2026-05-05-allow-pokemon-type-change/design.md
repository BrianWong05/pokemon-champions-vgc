## Context

Currently, a Pokémon's types are automatically derived from its base species stats when selected. However, various in-game mechanics (moves like Soak/Magic Powder/Forest's Curse, abilities like Protean/Libero, and Tera types) can change these types. The Smogon `Pokemon` object supports arbitrary types, so we just need to expose this control in the UI and state.

## Goals / Non-Goals

**Goals:**
- Allow users to manually change Type 1 and Type 2 for both Attacker and Defender.
- Ensure that selecting a new Pokémon species still defaults to its correct base types, but allows subsequent overrides.
- Reflect these type changes in the damage calculation immediately.

**Non-Goals:**
- Automatically applying type changes based on move effects (e.g., clicking "Soak" doesn't automatically change the defender to Water-type; the user must do it manually).
- Tera Type support (this may be a separate future change, though manual type override covers the basic damage implication).

## Decisions

1. **State Update**:
   - `CalcState` already has `type1` and `type2` in `SideState`.
   - Add a new action `SET_TYPE` to `CalcAction`:
     ```typescript
     | { type: 'SET_TYPE', payload: { side: 'p1' | 'p2', slot: 1 | 2, type: string | null } }
     ```

2. **UI Component**:
   - Add a "Type Configuration" section to the `PokemonPanel`.
   - Use two dropdown menus for Type 1 and Type 2.
   - Include all 18 types + "None" for Type 2.
   - Use color-coded type indicators (pills) for visual consistency.

3. **Logic Mapping**:
   - `mapToSmogonPokemon` currently pulls types from the base stats.
   - *Decision*: Change it to use `sideState.type1` and `sideState.type2` directly.
   - Ensure the Smogon engine receives these as an array: `types: [type1, type2].filter(Boolean)`.

## Risks / Trade-offs

- **Risk**: Users might forget they've overridden a type after changing Pokémon species.
  - *Mitigation*: Reset `type1` and `type2` to the new species' default types whenever `SELECT_POKEMON` is dispatched.
- **Risk**: Selecting "None" for both types.
  - *Mitigation*: Enforce at least one valid type in the UI or default to "Normal" if both are null.
