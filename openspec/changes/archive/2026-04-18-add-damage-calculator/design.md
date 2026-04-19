## Context

The damage calculator is a core feature for any competitive Pokémon website. Our implementation is unique because it must account for the "SP" (Special Points) system where:
- HP = Base + 75 + SP
- Stats = floor((Base + 20 + SP) * Nature)
- Level is fixed at 50 for VGC.

## Goals / Non-Goals

**Goals:**
- Provide a responsive 3-column layout.
- Use range sliders for SP (0-32).
- Dynamically update damage ranges as inputs change.
- Support both Physical and Special categories.

**Non-Goals:**
- Supporting dynamic levels (Level 50 only).
- Supporting items or abilities (can be added as future capabilities).
- Field conditions like weather or terrain (can be added later).

## Decisions

- **State Management**: Use `useReducer` to manage the complex, nested state of the Attacker, Defender, and Move. This is cleaner than multiple `useState` calls.
- **Stat Formulas**: 
    - `calculateHP(base, sp) => base + 75 + sp`
    - `calculateStat(base, sp, nature) => Math.floor((base + 20 + sp) * nature)`
- **Damage Math**: 
    - `baseDamage = Math.floor(Math.floor((22 * power * atk / def) / 50) + 2)`
    - `finalRange = [Math.floor(baseDamage * mod * 0.85), Math.floor(baseDamage * mod)]`
- **Component Structure (Atomic Design)**:
    - **Atoms**: `Slider`, `NumberInput`, `Select`, `ProgressBar`.
    - **Molecules**: `StatControlGroup`, `MoveControlGroup`.
    - **Organisms**: `AttackerPanel`, `DefenderPanel`, `ResultsPanel`.
    - **Templates**: `DamageCalculatorTemplate`.

## Risks / Trade-offs

- **[Risk]** Mathematical drift from standard VGC math → **[Mitigation]** The formula provided by the user is a simplified version of the standard equation; we will stick strictly to the user-provided formulas to ensure accuracy within the "Champions" system.
- **[Risk]** UI clutter on mobile → **[Mitigation]** Use a single-column stack on small screens.
