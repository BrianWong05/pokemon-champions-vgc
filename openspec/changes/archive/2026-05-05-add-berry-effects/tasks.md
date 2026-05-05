## 1. Engine Verification and Bug Fixes

- [x] 1.1 Verify if `@smogon/calc` properly handles berries when they are passed via the `item` property on the `Pokemon` object.
- [x] 1.2 If there is a disconnect (e.g. wrapper overriding the item improperly, or an issue with how damage calculation utilities construct the defender's item), fix the data mapping in `calculateDamage` or `mapToSmogonPokemon` so that type-resist berries are properly applied.

## 2. Integration Testing

- [x] 2.1 Add an automated test case or log verification to confirm that holding a Chople Berry reduces super-effective Fighting-type damage by half.
- [x] 2.2 Verify that the UI displays the updated damage correctly when a type-resist berry is selected.