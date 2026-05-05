## 1. Implement Support Move Logic

- [x] 1.1 Modify the damage calculation engine to check for active screens (Reflect, Light Screen) on the defender's side and apply the 0.5x damage multiplier if applicable.
- [x] 1.2 Implement logic for Aurora Veil: when active on the defender's side, apply a 0.5x damage multiplier to both physical and special incoming attacks.
- [x] 1.3 Implement logic for Helping Hand: when an ally uses Helping Hand, temporarily boost the attacker's move power by 1.5x before damage calculation.
- [x] 1.4 Implement logic for Friend Guard: when an adjacent ally has Friend Guard, apply a 0.75x damage reduction multiplier to the damage taken by the target if it's an adjacent ally.

## 2. Integrate with Existing Calculation

- [x] 2.1 Ensure that the new support move effects are applied at the correct stage of the damage calculation flow, as defined in the design document.
- [x] 2.2 Verify that these effects do not interfere with existing mechanics like STAB, type effectiveness, or stat boosts/penalties.

## 3. Verification and Testing

- [x] 3.1 Add unit tests for Reflect and Light Screen to confirm damage reduction against physical and special attacks respectively.
- [x] 3.2 Add unit tests for Aurora Veil to confirm damage reduction against both attack types.
- [x] 3.3 Add unit tests for Helping Hand to verify the move power boost.
- [x] 3.4 Add unit tests for Friend Guard to confirm damage reduction for adjacent allies.
- [x] 3.5 Manually test scenarios with multiple support effects active to ensure correct interaction.