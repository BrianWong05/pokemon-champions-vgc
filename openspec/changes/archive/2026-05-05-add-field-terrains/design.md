## Context

Terrains are field conditions introduced in Gen 6 that modify move power and secondary effects for grounded Pokémon. In Gen 9 (current target), terrains provide a 1.3x boost to moves of their respective type (except Misty). Grassy Terrain also reduces the damage of certain ground-type moves. These effects are managed by the `Field` object in `@smogon/calc`.

## Goals / Non-Goals

**Goals:**
- Add a `terrain` selector to the damage calculator field settings.
- Map the selected terrain to the Smogon `Field` object.
- Ensure damage calculations reflect terrain-based multipliers.

**Non-Goals:**
- Automated terrain detection from abilities like Grassy Surge (manual selection only).
- Grounded check automation (for now, the calculator assumes grounded unless explicitly handled, but Smogon's engine handles the grounded check if we pass the `Field` correctly).

## Decisions

1. **State Structure**:
   Update `CalcState` to include:
   ```typescript
   terrain: 'None' | 'Electric' | 'Grassy' | 'Misty' | 'Psychic';
   ```
   Add a `SET_TERRAIN` action to `CalcAction`.

2. **Logic Integration**:
   - Update `mapToSmogonField` in `src/utils/damage.ts` to accept the `terrain` string.
   - Map 'None' to `undefined` or an empty string as per Smogon's `Field` requirements.

3. **UI Implementation**:
   - Update `DamageCalculatorTemplate` to include a `terrain` prop and `onTerrainChange` callback.
   - Add a terrain selection bar in the field settings area, using color coding for each terrain (e.g., yellow for Electric, green for Grassy, pink for Misty, purple for Psychic).

## Risks / Trade-offs

- **Risk**: Overlapping field controls leading to a cluttered UI.
  - *Mitigation*: The field settings area will be refactored to use a horizontal layout with distinct sections for Weather, Mode, Auras, and Terrains.
- **Risk**: Smogon engine version compatibility.
  - *Mitigation*: `@smogon/calc` already supports terrains natively in its Gen 9 implementation.
