## Context

We have implemented `attackerHpPercent` and `defenderHpPercent` state. This design outlines how to leverage those values within the damage calculation pipeline to trigger HP-relative abilities.

## Goals / Non-Goals

**Goals:**
- Update `getBasePowerModifier`, `getStatModifier`, and `getFinalDamageModifier` to be HP-aware.
- Implement specific math for Multiscale, Shadow Shield, Blaze, Torrent, Overgrow, Swarm, and Defeatist.
- Provide visual feedback when these abilities trigger.

**Non-Goals:**
- Exhaustive implementation of every HP-based ability (focusing on the requested staples).
- Multi-turn HP recovery or residual damage simulation.

## Decisions

### 1. Pipeline Signature Updates
We will update the following signatures in `src/utils/damage.ts`:
- `getBasePowerModifier(..., attackerHpPercent: number)`
- `getStatModifier(..., attackerHpPercent: number)`
- `getFinalDamageModifier(..., defenderHpPercent: number)`

### 2. HP Threshold Implementation
- **Full HP**: Check for `hpPercent === 100`.
- **Low HP (Starter Boosts)**: Check for `hpPercent <= 33.33`.
- **Half HP (Penalty)**: Check for `hpPercent <= 50`.

### 3. Visual Feedback Architecture
To handle the "UI Feedback" requirement, we will update the `DamageResult` interface in `src/components/organisms/ResultsPanel.tsx` to include an optional `activeAbilities` array. This allows the calculation engine to pass back which abilities were triggered during the math, which the UI can then render as badges.

### 4. Logic Placement
Threshold checks will be placed directly within the existing `switch` statements of the modifier functions to maintain consistency with the modular pipeline refactor.

## Risks / Trade-offs

- **[Risk]** Float comparison for 33.33%. -> **Mitigation**: Use a small epsilon or `<= 33.4` to ensure it triggers correctly if the slider is at 33%.
- **[Trade-off]** Static sound move list vs dynamic tags. -> **Decision**: Continue using the hardcoded list for now for simplicity, focusing on the HP logic.
