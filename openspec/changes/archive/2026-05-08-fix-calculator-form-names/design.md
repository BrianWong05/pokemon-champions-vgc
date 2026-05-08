## Context

The UI and our internal database store Pokémon names with certain suffixes or prefixes for presentation purposes (e.g., "Alolan Ninetales", "Basculegion (Male)"). However, the `@smogon/calc` engine expects very specific formatted strings (e.g., "Ninetales-Alola", "Basculegion"). When `mapToSmogonPokemon` passes an unrecognized string to the `Pokemon` constructor, it fails to find the base stats/typing and crashes the calculation for that move, resulting in 0% damage shown in the UI.

## Goals / Non-Goals

**Goals:**
- Provide a resilient normalization function that converts our DB names into Smogon's expected format.
- Integrate this function seamlessly into the existing `mapToSmogonPokemon` utility.

**Non-Goals:**
- Changing the names in the database (we want to keep the presentation names intact).
- Modifying how `@smogon/calc` works internally.

## Decisions

### 1. Regex and String Replacement Approach
We will implement a `normalizeSmogonName` function in `src/utils/damage.ts`. It will use a series of regex replacements to handle common patterns:
- Replace "Alolan X" with "X-Alola"
- Replace "Galarian X" with "X-Galar"
- Replace "Hisuian X" with "X-Hisui"
- Replace "Paldean X" with "X-Paldea"
- Replace "Mega X Y" with "X-Mega-Y"
- Replace "Mega X" with "X-Mega" (and fix special cases like Charizard/Mewtwo)
- Strip specific gender tags like `(Male)` for certain species where the male is the base form in Smogon (e.g., Basculegion, Meowstic, Indeedee)
- Replace `(Female)` with `-F` for those same species
- Format mask/style forms (e.g., Urshifu and Ogerpon)

*Rationale*: A regex/replace chain is easier to maintain and extend than a hardcoded dictionary of hundreds of forms.

## Risks / Trade-offs

- **Risk**: A newly introduced Pokémon form in the future might break the naming convention.
- **Mitigation**: We can add an explicit fallback dictionary in `normalizeSmogonName` for edge cases that defy the regex logic (e.g. `Urshifu (Single Strike)` -> `Urshifu`).