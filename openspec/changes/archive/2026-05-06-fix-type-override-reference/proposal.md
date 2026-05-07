## Why

The `PokemonConfigForm` component is throwing a `ReferenceError` because it's missing an import for `TYPE_IDS`. This happens specifically in the Damage Calculator when the type override functionality is used.

## What Changes

- Add the missing import for `TYPE_IDS` to `src/components/organisms/PokemonConfigForm.tsx`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `interactive-calculator-ui`: Fix the type override functionality.

## Impact

- **UI**: The "Manual Type Override" feature in the Damage Calculator will correctly render the dropdowns with available types.
