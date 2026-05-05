## 1. Core State and Integration

- [x] 1.1 Update the `PokemonState` or equivalent type to include an optional `item` property.
- [x] 1.2 Update the `calculateDamage` utility function to initialize the `@smogon/calc` `Pokemon` objects with the selected `item` for both Attacker and Defender.
- [x] 1.3 Ensure that existing default state correctly initializes with no item (or an empty string).

## 2. UI Updates

- [x] 2.1 Retrieve a list of valid items from `@smogon/calc` (e.g., `ItemName` type or values).
- [x] 2.2 Create or update an autocomplete/dropdown component for Item Selection.
- [x] 2.3 Integrate the Item Selection component into the Attacker panel, bound to the Attacker's item state.
- [x] 2.4 Integrate the Item Selection component into the Defender panel, bound to the Defender's item state.

## 3. Testing and Verification

- [x] 3.1 Verify that equipping Choice Band to the Attacker correctly increases physical damage output.
- [x] 3.2 Verify that equipping Assault Vest to the Defender correctly reduces special damage taken.
- [x] 3.3 Verify that changing the hold item updates the damage calculations reactively without requiring a page refresh.