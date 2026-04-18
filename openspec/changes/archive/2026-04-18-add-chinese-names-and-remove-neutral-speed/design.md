## Context

The Speed Tier List currently fetches only English names. The database (`pokemon` table) already contains `name_zh` columns. We need to expose this data to the frontend and update the Atomic components to render it.

## Goals / Non-Goals

**Goals:**
- Fetch `nameZh` from the database.
- Display the Chinese name clearly in each Pokémon row.
- Maintain a clean and professional UI layout.

**Non-Goals:**
- Adding full multi-language toggle (this is just adding a second name display for now).
- Changing existing English name display logic.

## Decisions

- **Data Query**: Update the Drizzle select in `src/pages/SpeedTierList/index.tsx` to include `nameZh: pokemon.nameZh`.
- **UI Placement**: In `StatGridItem.tsx`, the Chinese name will be placed below or next to the English name in a smaller, slightly more subtle font to provide clarity without cluttering the primary name display.
- **Grid Layout Refactor**: Remove the "Neutral" (uninvested) column. Distribute the extra columns to the Pokémon name and Min- columns.
    - Final Proposed Layout:
        - Pokemon: `col-span-4 lg:col-span-5`
        - Base: `col-span-1 lg:col-span-1`
        - Max+: `col-span-2 lg:col-span-2`
        - Max: `col-span-2 lg:col-span-2`
        - Min-: `col-span-3 lg:col-span-2`
- **Fallbacks**: Handle cases where `nameZh` might be null (though it should be populated for most Pokémon).

## Risks / Trade-offs

- **[Risk]** UI clutter in the "Pokemon" column → **[Mitigation]** Use a vertical stack for the names or a smaller font size for the Chinese name to keep the row height manageable.
