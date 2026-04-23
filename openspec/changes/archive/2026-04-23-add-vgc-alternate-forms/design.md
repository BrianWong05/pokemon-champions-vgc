## Context

The calculator currently lacks competitive alternate forms (IDs > 10000). These forms often have different types and stats than their base forms. We need to update the seeder and frontend to support them.

## Goals / Non-Goals

**Goals:**
- Include competitive alternate forms in the database.
- Standardize naming to `Base Name (Form Name)`.
- Ensure images load correctly for IDs > 10000.
- Update frontend search to include form names.

**Non-Goals:**
- Including all 1000+ forms (focus only on competitive ones).
- Adding form-switching UI (each form will be a separate entry for now).

## Decisions

### 1. Seeder Filtering (Python)
- Modify `extract_pokeapi_data.py` to allow IDs > 10000.
- Implement a regex-based or whitelist-based filter to include identifiers containing competitive keywords:
  - `wash, heat, frost, fan, mow` (Rotom)
  - `therian` (Landorus, Thundurus, Tornadus, Enamorus)
  - `rapid-strike, single-strike` (Urshifu)
  - `hearthflame, wellspring, cornerstone` (Ogerpon)
  - `crowned` (Zacian, Zamazenta)
  - `mega, mega-x, mega-y`
  - `alola, galar, hisui, paldea`
  - `dusk, midnight` (Lycanroc)

### 2. Naming Logic
- Implement a `format_form_name` function:
  - Identifiers like `rotom-wash` -> `Rotom (Wash)`.
  - Handle exceptions like `urshifu-rapid-strike` -> `Urshifu (Rapid Strike)`.
  - Use this in the seeder for `name_en` and `name_zh` columns.

### 3. Frontend Integration
- **Search**: Update `PokemonSearchSelect.tsx` to match against the formatted name and the raw identifier.
- **Images**: Confirm `PokemonImage.tsx` uses the numeric `id` to build the path `/images/pokemon/thumbnails/${id}.png`. Since PokeAPI IDs for forms are unique and > 10000, this will naturally work if the images are present in the `public` folder.

## Risks / Trade-offs

- **[Risk]** Image missing for new forms. → **Mitigation**: Verify image assets exist or update the image processing script.
- **[Trade-off]** Duplicate base names in dropdown. → **Decision**: Using `Base (Form)` format clearly distinguishes them.
