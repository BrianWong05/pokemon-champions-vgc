## Context

Modern competitive Pokémon features abilities that change a move's type and potentially boost its power. Our current pipeline calculates everything based on the static database type, missing these crucial dynamic interactions.

## Goals / Non-Goals

**Goals:**
- Implement dynamic type conversion (Pixilate, Liquid Voice, etc.).
- Apply the 1.2x "-ate" ability power boost.
- Ensure STAB and effectiveness use the converted type.
- Provide UI feedback for the type change.

**Non-Goals:**
- Dynamic move flag detection from database (will use hardcoded list for sound moves for now).
- Field/Terrain type overrides (e.g., Ion Deluge).

## Decisions

### 1. New Utility: `getModifiedMoveType`
Create a function in `src/utils/damage.ts`:
`getModifiedMoveType(originalType: string, moveName: string, ability: string | null): string`
- Handles Pixilate (Normal -> Fairy), etc.
- Uses a hardcoded `SOUND_MOVES` list to detect Liquid Voice targets (e.g., "Hyper Voice", "Sparkling Aria").

### 2. Update `getBasePowerModifier`
Add `originalType` and `modifiedType` parameters.
- If `originalType === 'normal'` and `modifiedType !== 'normal'`, and ability is an "-ate" ability, return `1.2`.

### 3. Pipeline Refactor (`DamageCalculator`)
Reorder `computeResults` to:
1. `modifiedType = getModifiedMoveType(...)`
2. `bpMod = getBasePowerModifier(..., modifiedType)`
3. `stabMultiplier = isStab(modifiedType, attackerTypes) ? ...`
4. `effectiveness = calculateEffectiveness(..., modifiedType, defenderTypes)`

### 4. UI Feedback
Update `DamageResult` interface to include `modifiedType`.
In `ResultsPanel.tsx`, if `modifiedType !== originalType`, render the move name as `Move Name (Type)`.

## Risks / Trade-offs

- **[Risk]** Missing sound moves. → **Mitigation**: Hardcode common competitive sound moves (Hyper Voice, Snarl, Boomburst, Bug Buzz).
- **[Trade-off]** Hardcoding "-ate" list in BP modifier. → **Decision**: Explicit list is safer for precise 1.2x application.
