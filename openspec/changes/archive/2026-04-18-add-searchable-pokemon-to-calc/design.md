## Context

The current `DamageCalculator` uses hardcoded base stats or manual entry. We have a pre-populated database with Regulation M-A Pokémon and their base stats. We need to integrate a searchable selection UI to allow users to quickly load Pokémon data.

## Goals / Non-Goals

**Goals:**
- Implement a `PokemonSearchSelect` component using Tailwind CSS.
- Fetch all Regulation M-A Pokémon stats using Drizzle ORM.
- Link selection to the calculator state (auto-updating base stats).
- Display Pokémon thumbnails in the selection UI.

**Non-Goals:**
- Real-time database updates from the UI (read-only fetch).
- Implementing move selection from the database (manual move power entry for now).

## Decisions

- **Data Fetching**: The `DamageCalculatorPage` will fetch all legal Pokémon on mount and pass the list to both panels. This avoids redundant queries.
- **Component**: `PokemonSearchSelect` will be a controlled component using a filtered list based on text input.
- **State Integration**: When a Pokémon is selected, the `SET_ATTACKER` or `SET_DEFENDER` action in the `useReducer` will be dispatched with the new `baseAtk`/`baseHp`/etc. values.
- **Formulas**: We continue to use the established Champions formulas:
    - HP = Base + 75 + SP
    - Stats = floor((Base + 20 + SP) * Nature)

## Risks / Trade-offs

- **[Risk]** Large list of Pokémon (250+) causing search lag → **[Mitigation]** Standard React filtering on a list of this size is very fast. We will optimize if needed.
- **[Risk]** Layout overcrowding → **[Mitigation]** We will place the search field and thumbnail at the top of each panel to keep the layout organized.
