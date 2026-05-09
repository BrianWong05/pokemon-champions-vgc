## Why

Aegislash is a unique Pokémon that changes between Shield and Blade forms in battle via its Stance Change ability. Currently, only the Shield form is available in the calculator, making it impossible to calculate damage for its offensive Blade form.

## What Changes

- Add a toggle in the Pokémon editor specifically for Aegislash to switch between Shield and Blade forms.
- Implement logic to swap base stats (Attack/Defense and Sp. Atk/Sp. Def) when the form is changed.
- Ensure the selected form is persisted in the team configuration.

## Capabilities

### New Capabilities
- `aegislash-form-toggle`: Provides a mechanism to switch Aegislash between Shield and Blade formes, automatically adjusting base stats.

### Modified Capabilities

## Impact

- `src/hooks/usePokemonEditor.ts`: State and reducer logic to handle form changes.
- `src/components/organisms/PokemonConfigForm.tsx`: UI implementation for the form toggle.
- `src/utils/damage.ts`: Ensure damage calculations account for the swapped stats.
