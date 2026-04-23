## 1. Python Seeder Refactor (scripts/extract_pokeapi_data.py)

- [x] 1.1 Update the seeder to include Pokémon with IDs > 10000.
- [x] 1.2 Implement the `FORM_WHITELIST` filter to include competitive forms.
- [x] 1.3 Refactor `localize_form_name` (or add a new utility) to produce `Base (Form)` display names.
- [x] 1.4 Re-run the seeder and verify the `pokemon` table contains the new forms.
- [x] 1.5 Sync the updated database to the `public/` directory.

## 2. Frontend Integration (src/components/molecules/PokemonSearchSelect.tsx)

- [x] 2.1 Update the search logic to ensure it matches against formatted form names.
- [x] 2.2 Verify that the search dropdown correctly displays the `Base (Form)` name.
- [x] 2.3 Ensure the keyboard navigation and selection work correctly with the expanded list.

## 3. Image and Verification

- [x] 3.1 Verify that form-specific thumbnails (e.g., 10008.png for Rotom-Wash) load correctly in the UI.
- [x] 3.2 Perform a manual check of key forms (Urshifu-Rapid, Landorus-T, Ogerpon-Hearthflame) in the calculator.
- [x] 3.3 Ensure base stats and types for these forms match competitive expectations.
