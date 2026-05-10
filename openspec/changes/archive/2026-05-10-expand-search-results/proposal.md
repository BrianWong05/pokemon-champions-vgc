## Why
Current search dropdowns for Pokémon and items are capped at 10 and 15 results respectively, which hides available database entries from the user.

## What Changes
- Increase or remove the slice limit for search results in `PokemonSearchSelect` and `ItemSearchSelect`.
- Ensure performance remains acceptable with larger result sets.

## Capabilities

### New Capabilities
- `unrestricted-search-results`: Removing artificial search result caps.

### Modified Capabilities
- 

## Impact
- Users can see and select from a much larger pool of Pokémon and items.
