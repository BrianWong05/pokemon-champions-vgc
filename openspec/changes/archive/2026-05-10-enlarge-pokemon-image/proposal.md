## Why

The current Pokémon thumbnails in the Speed Tier List and detail views are small (10x10), making it difficult to appreciate the visual details of the Pokémon. Users want larger, more prominent images to improve the visual appeal and recognition.

## What Changes

- **Image Sizing**: Increase the default display size of Pokémon images in the Speed Tier List and other shared components.
- **Visual Clarity**: Ensure the enlarged images maintain high visual quality without distortion.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `pokemon-display`: Update the `PokemonImage` component and its usage in the `StatGridItem` (from the previous change) and potentially other components to support larger dimensions.

## Impact

- **UI Components**: Modification of `src/components/atoms/PokemonImage.tsx` to allow flexible sizing or a larger default size.
- **Frontend**: Minor CSS/Tailwind adjustments where `PokemonImage` is used to ensure the new size fits well in the compact grid cards.
