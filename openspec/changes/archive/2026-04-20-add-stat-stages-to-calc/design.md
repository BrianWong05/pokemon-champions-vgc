## Context

Pokémon stats can be modified by stages ranging from -6 to +6. These stages significantly impact damage calculations, especially in VGC where buffs like Swords Dance and debuffs like Intimidate are prevalent.

## Goals / Non-Goals

**Goals:**
- Add stat stage tracking (-6 to +6) for Atk, Def, SpA, SpD, and Spe.
- Implement fractional multipliers for positive and negative stages.
- Add compact, intuitive stage controls to the `StatGrid`.
- Ensure damage calculations react instantly to stage changes.

**Non-Goals:**
- Implementing HP stages (not a game mechanic).
- Implementing Accuracy/Evasion stages (standard damage only).
- Automatic stage resets (manual control only).

## Decisions

- **State Management**:
    - Update `SideState` to include `stages: Record<string, number>`.
    - Add `SET_STAT_STAGE` action to `calcReducer` with clamping between -6 and +6.
- **Math Implementation**:
    - Add `getStageMultiplier(stage: number): number` to `src/utils/damage.ts`.
    - Positive: `(2 + n) / 2` (e.g., +2 = 2.0x, +6 = 4.0x).
    - Negative: `2 / (2 + |n|)` (e.g., -2 = 0.5x, -6 = 0.25x).
    - Multiplier applied *after* Nature but *before* other modifiers.
- **UI Design**:
    - Use a 12-column grid for each stat row.
    - Column Order: Stat (2), Base (1), SP Slider (3), Nature +/- (2), Stage (1), SP Numeric (1), Total (2).
    - Header: Stat, Base, SP, Nature, Stage, Total.
    - Color coding: `text-green-500` for positive, `text-red-500` for negative, `text-gray-400` for zero stages.

## Risks / Trade-offs

- **[Risk]** UI crowding in `StatRow` → **[Mitigation]** Use very compact buttons and minimize font sizes for stage labels. Ensure the row doesn't break on narrow containers.
- **[Risk]** Order of operations errors → **[Mitigation]** Strictly follow the standard formula: `Nature` calculation first, then `Stage` calculation.
