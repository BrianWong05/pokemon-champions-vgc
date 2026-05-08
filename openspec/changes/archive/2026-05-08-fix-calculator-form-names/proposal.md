## Why

The damage calculator currently shows 0% damage when calculating against certain specific Pokémon forms, such as "Basculegion (Male)", "Alolan Ninetales", and various Mega Evolutions. This occurs because the names in our local database do not match the exact naming conventions expected by the underlying `@smogon/calc` engine, causing the calculator to fail silently and return zero values.

## What Changes

- Implement a robust mapping utility that converts our database's localized/formatted Pokémon names into the exact species names required by `@smogon/calc`.
- Ensure the mapping handles regional forms (Alolan, Galarian, Hisuian, Paldean), Mega Evolutions, gender-specific forms (Male/Female), and specific functional forms (e.g., Urshifu Styles, Ogerpon Masks).
- Integrate this mapping utility into the `mapToSmogonPokemon` function so that all damage calculations receive valid species names.

## Capabilities

### New Capabilities
- `smogon-name-mapping`: Capability to translate and normalize Pokémon names between the internal representation and the external `@smogon/calc` library's expected format.

### Modified Capabilities
- `damage-calculation-logic`: Update the `mapToSmogonPokemon` mapping logic to utilize the new name normalization.

## Impact

- `src/utils/damage.ts`: New parsing and normalization logic.
- Calculator UI: Will correctly display non-zero, accurate damage ranges for complex forms.