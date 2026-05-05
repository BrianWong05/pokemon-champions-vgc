## Why

The damage calculator currently displays move names in English only. While the underlying database contains Chinese move names, the user interface does not expose them. This makes it difficult for Chinese-speaking users to search for and identify moves accurately.

## What Changes

- Update `MoveSearchSelect` component to display Chinese move names in the search results list.
- Update `PokemonPanel` component to display the Chinese name of the selected move.
- Update `DamageResult` interface and `ResultsPanel` component to include and display Chinese move names in the damage assessment list.
- Ensure the search logic in `MoveSearchSelect` continues to support both English and Chinese input.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `interactive-damage-calculator-ui`: The UI requirements for move selection and results display will be updated to include multilingual (Chinese) support.

## Impact

- **UI Components**: `MoveSearchSelect`, `PokemonPanel`, and `ResultsPanel` will be updated to handle and display `nameZh`.
- **State/Data Mapping**: The calculation logic in `DamageCalculator/index.tsx` will be updated to pass `nameZh` into the results.
- **Data Model**: The existing `nameZh` column in the `moves` table will be utilized.
