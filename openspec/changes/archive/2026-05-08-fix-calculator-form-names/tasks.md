## 1. Smogon Name Normalization

- [x] 1.1 Create the `normalizeSmogonName` function in `src/utils/damage.ts`.
- [x] 1.2 Add logic to handle regional forms (Alolan, Galarian, Hisuian, Paldean).
- [x] 1.3 Add logic to handle Mega Evolutions (including X/Y variants).
- [x] 1.4 Add logic to handle gendered forms (Male/Female) for specific species like Basculegion, Meowstic, and Indeedee.
- [x] 1.5 Add a fallback dictionary in `normalizeSmogonName` for complex forms like Urshifu styles and Ogerpon masks.

## 2. Damage Utility Integration

- [x] 2.1 Update `mapToSmogonPokemon` in `src/utils/damage.ts` to call `normalizeSmogonName` on the `pokemonName` before initializing the `Pokemon` class.
- [x] 2.2 Verify that the damage calculator UI now displays non-zero damage percentages when calculating moves against previously failing forms like "Basculegion (Male)" and "Alolan Ninetales".