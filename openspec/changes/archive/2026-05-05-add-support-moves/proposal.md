## Why

The damage calculator currently lacks proper support for status moves that affect the battle environment or team dynamics, such as Reflect, Light Screen, Helping Hand, and Friend Guard. These moves are crucial in competitive Pokémon battles (VGC) and significantly impact the outcome of turns. Without their accurate implementation, the calculator cannot provide a true simulation of competitive play.

## What Changes

- Implement logic to handle the effects of moves like Reflect and Light Screen, which create barriers that reduce incoming damage.
- Implement logic for moves like Helping Hand, which boost the power of an ally's move.
- Implement logic for abilities or moves like Friend Guard, which reduce damage taken by adjacent allies.
- Integrate these new mechanics into the damage calculation flow to ensure accurate damage output under these conditions.

## Capabilities

### New Capabilities
- `support-move-handling`: This new capability will encompass the logic for handling status moves, field effects (like screens), and ally-affecting abilities.

### Modified Capabilities
- `damage-calculation-logic`: This will need to be modified to account for the effects of support moves and abilities when calculating damage.

## Impact

- **Damage Calculation Logic**: Core functions responsible for damage calculation will need to be extended to consider these new mechanics.
- **Battle State Management**: The representation of the battle state might need updates to track active screens, ally status, etc.
- **UI**: The UI might need to reflect these effects (though this is out of scope for artifact generation and would be part of a UI-specific change).
