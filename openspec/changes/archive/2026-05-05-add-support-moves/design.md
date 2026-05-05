## Context

The current damage calculation logic primarily focuses on offensive moves and direct stat modifications. It does not account for defensive buffs like Reflect and Light Screen, nor for support moves that alter damage dealt or taken by allies (e.g., Helping Hand, Friend Guard). These mechanics are critical for competitive play (VGC) and need to be accurately simulated.

## Goals / Non-Goals

**Goals:**
- Implement logic for Reflect and Light Screen to reduce damage from physical and special attacks, respectively.
- Implement logic for Aurora Veil to reduce damage from both physical and special attacks.
- Implement logic for Helping Hand to boost an ally's move power.
- Implement logic for Friend Guard to reduce damage taken by adjacent allies.
- Ensure these effects are correctly applied during damage calculation.

**Non-Goals:**
- We are not implementing the visual representation of these effects in the UI.
- We are not handling the turn-based duration of these effects (e.g., Reflect lasting 5 turns) in this specific change. This will be handled by a broader battle state management system.

## Decisions

- **Integration Point**: These effects will be integrated into the damage calculation process *after* base damage, STAB, type effectiveness, and stat modifiers are applied, but *before* final damage reduction/modification is determined.
- **Damage Reduction Calculation**: For Reflect/Light Screen/Aurora Veil, a multiplier will be applied to the damage calculation. For Friend Guard, a similar multiplier will be applied to the *defender's* resulting damage.
- **Power Boost**: For Helping Hand, the move's base power will be temporarily boosted before being passed into the damage calculation.
- **Data Representation**: The `DamageResult` object will be extended to include flags or values indicating active support effects that influenced the calculation.

## Risks / Trade-offs

- [Risk] Interactions between multiple support moves (e.g., screens, Friend Guard).
  - *Mitigation*: Ensure calculations are additive or multiplicative based on established Pokémon mechanics, and prioritize effects if conflicts arise (e.g., screens might stack or overwrite).
- [Risk] Performance impact of adding more checks to the damage calculation.
  - *Mitigation*: Optimize calculations and ensure checks are only performed when relevant.