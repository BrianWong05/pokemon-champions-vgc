## Context

Aegislash has two forms: Shield (Defensive) and Blade (Offensive). In the database, only the Shield form (ID: 681) exists with base stats 60/50/140/50/140/60. The Blade form swaps the offensive and defensive stats to 60/140/50/140/50/60.

## Goals / Non-Goals

**Goals:**
- Implement a form toggle specifically for Aegislash in the Pokémon editor.
- Automatically swap base Attack with base Defense and base Sp. Atk with base Sp. Def when toggled.
- Update the UI to reflect the current form name and stats.

**Non-Goals:**
- Adding a permanent second entry to the database (handle via frontend state).
- Implementing general form management for all Pokémon (keep it scoped to Aegislash for now).

## Decisions

- **PokemonConfig Extension:** Add an optional `form` property to the `PokemonConfig` interface.
- **Stat Swapping Logic:** Handle the swap within the `usePokemonEditor` reducer to ensure all dependent calculations (totals, damage) update automatically.
- **UI Trigger:** Display a "Stance Change" toggle button in the `PokemonConfigForm` when Aegislash is selected.

## Risks / Trade-offs

- **Manual Stat Management:** Swapping stats manually in the reducer might be error-prone if not handled carefully.
    - [Mitigation] Implement a robust `TOGGLE_AEGISLASH_FORM` action that uses the original base stats as the reference point to avoid cumulative errors.
- **Hardcoding ID 681:**
    - [Risk] Direct dependency on database IDs.
    - [Mitigation] Create a constant `AEGISLASH_ID = 681` to make the code more readable and easier to maintain if IDs change.
