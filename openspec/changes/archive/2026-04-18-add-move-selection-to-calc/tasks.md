## 1. Data Fetching & Integration

- [x] 1.1 Implement a Drizzle query in `DamageCalculatorPage` to fetch moves learned by the selected Attacker.
- [x] 1.2 Update the `CalcState` to include `attackerMoves` and `selectedMove`.

## 2. Component Development

- [x] 2.1 Create `src/components/molecules/MoveSearchSelect.tsx` with name, power, and category display.
- [x] 2.2 Update `AttackerPanel` to include the `MoveSearchSelect` and display move details.

## 3. Logic Refactor

- [x] 3.1 Update the damage calculation `useMemo` block to select the correct attacker stat (Atk/SpA) and defender stat (Def/SpD) based on move category.
- [x] 3.2 Update `isStab` calculation to use move's `typeId` and attacker's types.

## 4. Verification

- [x] 4.1 Verify that move selection correctly updates power and category.
- [x] 4.2 Verify that Physical moves use Attacker Atk / Defender Def.
- [x] 4.3 Verify that Special moves use Attacker SpA / Defender SpD.
- [x] 4.4 Verify STAB is correctly auto-calculated.
