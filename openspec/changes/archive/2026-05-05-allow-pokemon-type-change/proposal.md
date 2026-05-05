## Why

Certain moves (e.g., Soak, Magic Powder) or abilities (e.g., Protean, Libero) can change a Pokémon's typing during battle. To provide accurate damage calculations for these scenarios, users must be able to manually override the default types of selected Pokémon.

## What Changes

- **State Management**: Allow `type1` and `type2` in `SideState` to be manually edited via the UI, bypassing the default types provided by the selected Pokémon ID.
- **UI Integration**: Implement type selection dropdowns or toggles in the Pokémon configuration panels (Attacker and Defender).
- **Logic Mapping**: Ensure the Smogon `Pokemon` object is instantiated with these overridden types.

## Capabilities

### New Capabilities
- `pokemon-type-customization`: Ability to manually override a Pokémon's primary and secondary types.

### Modified Capabilities
- `smogon-calc-integration`: Update Pokémon mapping to use the application's current type state instead of the base stats' default types.

## Impact

- `src/pages/DamageCalculator/index.tsx`: State updates and reducer logic for type changes.
- `src/utils/damage.ts`: Mapping logic for `mapToSmogonPokemon`.
- `src/components/organisms/PokemonPanel/index.tsx`: UI for type selection.
