## Why

The current Damage Calculator only shows the name of the hold item. Displaying the item's image improves visual recognition and makes the interface feel more polished and authentic to the Pokémon series.

## What Changes

- Add a dynamic item image display next to the "Hold Item" selection dropdown.
- Implement a utility to map item names to their corresponding image assets in the `/items` directory.
- Update `PokemonPanel` to render the selected item's image.

## Capabilities

### New Capabilities
- `hold-item-visualization`: Displays high-quality item sprites in the calculator UI, synchronized with the current selection.

### Modified Capabilities
- `hold-item-mechanics`: Extend the mechanics to include asset resolution metadata (mapping name to sprite).

## Impact

- `src/components/organisms/PokemonPanel.tsx`: Will be updated to display the item image.
- New component or utility for item image resolution.
- Assets in `/items` directory will be utilized.
