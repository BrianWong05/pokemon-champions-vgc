## Why
The current Showdown export includes redundant information in the nature field (e.g., "Modest (+SPA, -ATK) Nature"), which deviates from the standard Showdown format ("Modest Nature").

## What Changes
- Refactor `formatShowdownSet` in `src/features/pokemon/utils/showdown-formatter.ts` to output only the nature name.

## Capabilities

### New Capabilities
- `showdown-nature-fix`: Standardizing the nature output format for Showdown exports.

### Modified Capabilities
- 

## Impact
- Corrects the exported format to be compatible with Showdown.
