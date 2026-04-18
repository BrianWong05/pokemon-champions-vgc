## Why

The application supports multiple languages in the database, but the Speed Tier List currently only displays English names. Adding Chinese names alongside English names will improve accessibility and utility for Chinese-speaking players, which is a significant part of the VGC community.

## What Changes

- Update the data fetching logic in `src/pages/SpeedTierList/index.tsx` to include the `nameZh` field from the database.
- Modify the `PokemonWithSpeeds` interface to include `nameZh`.
- Update `src/components/molecules/StatGridItem.tsx` to display the Chinese name (e.g., below or next to the English name).
- Remove the "Neutral" (uninvested) speed benchmark from the display logic and UI.
- Update `src/components/organisms/TierSection.tsx` to remove the "Neutral" header and refactor the grid layout.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `speed-tier-list`: Enhanced display logic to include localized (Chinese) names for Pokémon.

## Impact

- `src/pages/SpeedTierList/index.tsx`: Data query and interface updated.
- `src/components/molecules/StatGridItem.tsx`: UI and interface updated.
- `src/components/organisms/TierSection.tsx`: Interface updated.
