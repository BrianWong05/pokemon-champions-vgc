## Context

Pokémon abilities like Fairy Aura (Xerneas) and Dark Aura (Yveltal) are global field effects. While they are granted by an ability, their impact extends to every Pokémon on the field. The current implementation likely handles these as individual Pokémon modifiers, which is incorrect if the ability bearer is the ally or an opponent but the move is used by another Pokémon. Smogon's `@smogon/calc` handles these via the `Field` object.

## Goals / Non-Goals

**Goals:**
- Move Aura logic (Fairy Aura, Dark Aura, Aura Break) from individual Pokémon ability checks to the global field state.
- Update the `Field` mapping to pass `isFairyAura`, `isDarkAura`, and `isAuraBreak` to `@smogon/calc`.
- Add UI controls to toggle these field effects.

**Non-Goals:**
- Automated ability-to-field detection (for now, the user must manually toggle the aura if the Pokémon is present, similar to how Weather is handled).

## Decisions

1. **State Structure**:
   Update `CalcState` to include:
   ```typescript
   fairyAura: boolean;
   darkAura: boolean;
   auraBreak: boolean;
   ```
   These will be managed by a new set of actions.

2. **Logic Integration**:
   - Update `mapToSmogonField` in `src/utils/damage.ts` to accept these three flags.
   - The Smogon `Field` constructor supports:
     - `isFairyAura: boolean`
     - `isDarkAura: boolean`
     - `isAuraBreak: boolean`

3. **UI Implementation**:
   - Add a new section in `DamageCalculatorTemplate` or near the Weather selector for "Field Auras".
   - Use simple toggle buttons (similar to Target Mode or Weather).

## Risks / Trade-offs

- **Risk**: User confusion if they select both an aura ability AND the field aura.
  - *Mitigation*: Smogon's calculator usually ignores the ability if the field flag is set, or vice versa. We should ensure that if an aura ability is selected, it doesn't double-dip with the field setting if we are using Smogon's native field flags.
- **Risk**: Bloating the field state.
  - *Mitigation*: Auras are relatively rare (Gen 6 legends primarily), so they can be grouped in an "Advanced Field Options" if necessary, but for now, we'll place them near Weather.
