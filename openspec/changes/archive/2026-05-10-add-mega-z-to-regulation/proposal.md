## Why

The current Regulation M-A format incorrectly includes certain Mega evolution variants (Mega Z and Mega Raichu) that should be restricted. This change ensures the legality list accurately reflects the intended format rules by removing these unauthorized forms.

## What Changes

- **Removal**: Remove all Mega Z Pokémon (Absol, Garchomp, Lucario) from the Regulation M-A legality list.
- **Removal**: Remove Mega Raichu (X and Y variants) from the Regulation M-A legality list.
- **Data Cleanup**: Ensure `format_pokemon` and `calculated_speeds` tables are updated to reflect these removals.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `format-legality`: Update the Regulation M-A legality list to exclude Mega Z and Mega Raichu variants.
- `regulation-m-a-data-fetching`: Ensure data fetching logic reflects the updated legality.

## Impact

- **Database**: Records in `format_pokemon` linking these Pokémon IDs to "Regulation M-A" will be deleted.
- **Frontend**: These Pokémon will no longer appear in the Speed Tier List or Damage Calculator when "Regulation M-A" is selected.
- **Calculations**: Pre-calculated speeds for these specific variants may be removed or ignored for Regulation M-A.
