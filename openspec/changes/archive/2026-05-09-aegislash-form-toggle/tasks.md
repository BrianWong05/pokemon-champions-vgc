## 1. State and Logic Implementation

- [x] 1.1 Update `PokemonConfig` interface in `usePokemonEditor.ts` to include optional `form: 'Shield' | 'Blade'`
- [x] 1.2 Implement `TOGGLE_AEGISLASH_FORM` action in `usePokemonEditor` reducer
- [x] 1.3 Implement stat swapping logic in the reducer (ensure Attack ↔ Defense and Sp. Atk ↔ Sp. Def)

## 2. UI Implementation

- [x] 2.1 Add "Stance Change" toggle UI to `src/components/organisms/PokemonConfigForm.tsx` (visible only for Aegislash)
- [x] 2.2 Ensure the Pokémon name in the header reflects the current form (Shield/Blade)
- [x] 2.3 Update `src/utils/damage.ts` if needed to ensure calculations use the current base stats correctly

## 3. Verification

- [x] 3.1 Verify Aegislash stats swap correctly in the editor
- [x] 3.2 Verify damage calculator results update dynamically when form is toggled
