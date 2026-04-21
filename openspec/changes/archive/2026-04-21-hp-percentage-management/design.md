## Context

The Damage Calculator assumes all Pokémon start at 100% health. Adding a current HP state allows for more realistic battle scenarios and enables future mechanics like HP-scaling moves.

## Goals / Non-Goals

**Goals:**
- Add `currentHpPercent` state to both sides.
- Implement UI sliders and numeric inputs for HP management.
- Update KO logic to use current HP.
- Adjust visual HP bars to reflect current health starting point.

**Non-Goals:**
- Healing items or abilities (Leftovers, Sitrus Berry) - will be handled in future changes.
- Complex multi-turn KO simulations.

## Decisions

### 1. State Structure
We will add `hpPercent` (default 100) to the `SideState` in `DamageCalculator/index.tsx`.

### 2. UI Placement
The HP slider will be placed in the `PokemonPanel` component, directly below the HP stat row in the `StatGrid`.

### 3. Pipeline Update
`getBasePowerModifier` in `src/utils/damage.ts` will now receive `attackerHpPercent` as an additional parameter.

### 4. KO Evaluation Logic
`currentHpValue = Math.floor(maxHp * (hpPercent / 100))`
KO Evaluation in `ResultsPanel.tsx`:
- `minDamage >= currentHpValue` -> Guaranteed KO
- `maxDamage >= currentHpValue` -> Possible KO
- Otherwise -> Guaranteed Survival

## Risks / Trade-offs

- **[Risk]** Float precision in percentage calculations. -> **Mitigation**: Use `Math.floor` for raw HP values and percentage-to-HP conversion to stay consistent with Pokémon game logic.
