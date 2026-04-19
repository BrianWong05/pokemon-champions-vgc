## Why

Currently, STAB (Same-Type Attack Bonus) is a manual checkbox in the Damage Calculator. This is prone to user error and adds unnecessary manual steps. By automating STAB based on the attacker's types and the selected move's type, we can improve accuracy and streamline the calculation workflow.

## What Changes

- Update the data structures to include Pokémon types in the calculator state.
- Add a move type selector to the `AttackerPanel`.
- Implement logic to automatically determine if STAB applies by comparing the move's type with the attacker's primary and secondary types.
- Visual feedback in the UI showing the STAB multiplier when applicable.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `damage-calculation-logic`: Automate the STAB multiplier determination based on type matching.
- `interactive-damage-calculator-ui`: Add a move type selector and remove the manual STAB checkbox.

## Impact

- `src/pages/DamageCalculator/index.tsx`: State and reducer updated to handle types and automated STAB.
- `src/components/organisms/AttackerPanel.tsx`: UI updated to include a move type selector.
- `src/utils/damage.ts`: Potential adjustment if STAB logic is moved here.
