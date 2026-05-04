## Context

Gravity is a field condition that lasts for 5 turns. While active, all Pokémon are considered "grounded," meaning Flying-type Pokémon and those with Levitate lose their immunity to Ground-type moves and Spikes. Additionally, the accuracy of all moves is multiplied by 1.67x. The `@smogon/calc` library supports this through the `isGravity` flag on the `Field` object.

## Goals / Non-Goals

**Goals:**
- Add a Gravity toggle to the field settings.
- Map the toggle state to the Smogon `Field` object.
- Ensure Ground-type moves correctly calculate damage against Flying/Levitate Pokémon when Gravity is active.

**Non-Goals:**
- Accuracy calculation display (the current calculator focuses on damage ranges and KO chances).
- Restriction of moves like High Jump Kick (move selection is manual).

## Decisions

1. **State Management**:
   Update `CalcState` to include:
   ```typescript
   isGravity: boolean;
   ```
   Add a `TOGGLE_GRAVITY` action to `CalcAction`.

2. **UI Implementation**:
   - Add a "Gravity" button to the `DamageCalculatorTemplate`.
   - Style: Use a distinct color (e.g., indigo/violet) to distinguish it from Terrains and Auras.
   - Position: Place it in the field settings bar, alongside Auras and Terrains.

3. **Logic Mapping**:
   - Update `mapToSmogonField` in `src/utils/damage.ts` to include `isGravity`.
   - Update `computeResults` in `index.tsx` to pass the `isGravity` flag.

## Risks / Trade-offs

- **Risk**: Confusing UI due to too many toggles.
  - *Mitigation*: The recent change to `flex-wrap` in the field settings bar accommodates new toggles cleanly without overcrowding.
- **Risk**: Interaction with other grounding effects (e.g., Iron Ball).
  - *Mitigation*: Smogon's engine handles overlapping grounding effects correctly as long as the base state and field state are provided.
