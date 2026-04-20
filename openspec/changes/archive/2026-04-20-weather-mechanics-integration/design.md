## Context

The Damage Calculator needs to account for Gen 9 weather effects to provide accurate VGC simulations. We already have a modular pipeline that can be extended to include weather-based modifiers at multiple stages.

## Goals / Non-Goals

**Goals:**
- Implement Sun, Rain, Sandstorm, and Snow mechanics.
- Support "Weather Ball" dynamic type and power changes.
- Apply stat buffs for specific types in Sand and Snow.
- Apply damage multipliers for Fire/Water moves in Sun/Rain.
- Provide a clear UI for weather selection.

**Non-Goals:**
- Abilities that change weather on entry (Drizzle, Drought) - we will focus on manual weather selection first.
- Complex ability-weather interactions like Solar Power or Chlorophyll (stat focus for now).

## Decisions

### 1. Global Weather State
We'll use a string-based state `activeWeather` ('None', 'Sun', 'Rain', 'Sandstorm', 'Snow') in `DamageCalculator/index.tsx`.

### 2. Multi-Stage Pipeline Integration

#### Step 0: Move Type (`getModifiedMoveType`)
Handle "Weather Ball":
- Sun -> Fire
- Rain -> Water
- Sandstorm -> Rock
- Snow -> Ice

#### Step 1: Base Power (`getBasePowerModifier`)
Handle "Weather Ball":
- Double BP (100) if `activeWeather !== 'None'`.

#### Step 2: Stats (`getStatModifier`)
- **Sandstorm**: 1.5x Sp. Def for Rock-types.
- **Snow**: 1.5x Defense for Ice-types.

#### Step 3: Damage (`getWeatherDamageModifier`)
New utility function `getWeatherDamageModifier(weather, moveType)`:
- **Sun**: Fire (1.5x), Water (0.5x).
- **Rain**: Water (1.5x), Fire (0.5x).

### 3. UI Placement
"Field Conditions" section above Attacker/Defender columns with toggle-style buttons for each weather condition.

## Risks / Trade-offs

- **[Risk]** Missing Pokémon types for stat buffs. -> **Mitigation**: Ensure `getStatModifier` checks the Pokémon's current types correctly.
- **[Trade-off]** Simplified "Weather Ball" check. -> **Decision**: We'll use the move name "Weather Ball" as an identifier since it's a unique mechanic.
