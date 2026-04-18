## Why

The Pokémon Champions VGC format uses a custom "SP" system instead of the traditional EV system. Players need a simple, interactive tool to convert their existing EV spreads into the SP system to build valid teams. This tool will bridge the gap between traditional competitive Pokémon knowledge and the new system's rules.

## What Changes

- Create a new interactive converter page at `/converter`.
- Implement dynamic conversion logic: `SP = floor((EV + 4) / 8)`.
- Support 6-stat EV spreads with validation (0-252 per stat, 510 total).
- Provide real-time feedback on total SP generated (max 66).
- Follow Atomic Design methodology for new UI components.

## Capabilities

### New Capabilities
- `ev-sp-conversion-logic`: The mathematical formula and validation rules for translating EVs to SP.
- `interactive-calculator-ui`: A reactive UI for handling stat inputs and displaying results.

### Modified Capabilities
- None

## Impact

- `src/pages/EvSpConverter/`: New page component.
- `src/components/atoms/`: New Atoms like `StatInput` and `Badge`.
- `src/components/molecules/`: New Molecule `StatConverterRow`.
- `src/components/organisms/`: New Organism `EvSpForm`.
- `src/App.tsx`: Add routing for the new converter tool.
