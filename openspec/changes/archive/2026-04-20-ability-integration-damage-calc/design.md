## Context

The Damage Calculator currently ignores ability-based stat modifiers. Recent database updates added `abilities` and `pokemon_abilities` tables, enabling the inclusion of these modifiers.

## Goals / Non-Goals

**Goals:**
- Implement a multiplier-based system for ability effects.
- Provide a UI for selecting legal abilities for each Pokémon.
- Integrate ability modifiers into the stat calculation pipeline.

**Non-Goals:**
- Exhaustive implementation of every ability (focus on major ones like Huge Power).
- Field effects related to abilities (e.g., Drizzle).

## Decisions

### 1. Data Fetching
Update the Pokémon selection logic in `DamageCalculator` to fetch abilities from the junction table.

### 2. State Management
Add `attackerAbility` and `defenderAbility` to `SideState`.

### 3. Ability Logic
Implement `getAbilityModifier` in `src/utils/damage.ts` as a switch-based function.
- **Huge Power/Pure Power**: 2.0x for Attack.
- **Guts**: 1.5x for Attack.
- **Defeatist**: 0.5x for Attack/Sp. Atk when HP < 50% (initial focus on 1.0x).

### 4. Integration
Update `calculateStat` to accept an `abilityMultiplier`.
`FinalStat = floor(floor(RawStat * StageMultiplier) * AbilityModifier)`

### 5. UI Updates
Add a standard `<select>` dropdown in `PokemonPanel` below the search input.

## Risks / Trade-offs

- **[Risk]** Complex ability interaction (e.g., Neutralizing Gas). → **Mitigation**: Focus on stat-based modifiers first.
- **[Trade-off]** Hardcoding vs. Dynamic Data. → **Decision**: Hardcode modifiers for core abilities in a switch statement to maintain simplicity and performance.
