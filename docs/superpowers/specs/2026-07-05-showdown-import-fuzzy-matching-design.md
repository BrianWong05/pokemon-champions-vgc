# Pokémon Champions damage calculator — Spec 8: Showdown Import Fuzzy Matching & Team Import Selector UX

Date: 2026-07-05
Status: draft for review

## Goal & success criteria

**Goal:** Make Showdown set/team imports highly resilient to spelling typos, formatting anomalies, and Simplified/Traditional Chinese text variations. Additionally, improve the calculator's "Import from Team" selector UI so players can easily identify and choose saved Pokémon.

**Success Criteria:**
1. **Chinese Language Support:** Importers accept Simplified Chinese (SC) and Traditional Chinese (TC) set pastes. SC inputs are normalized to TC to match the database's `nameZh` format.
2. **Fuzzy Matching for Importers:** If a species, item, ability, or move name is not found exactly, the importer resolves it to the closest match in the database/Smogon list using Levenshtein distance (with a similarity threshold, e.g., `0.75` for English, `0.70` for Chinese).
3. **Graceful Error Handling:** If a match cannot be found above the threshold, it alerts the user with the specific unrecognized term instead of failing silently.
4. **Improved Team Import Selector UX:** The calculator's "Import from Team" popover displays the Pokémon's species name (e.g. *Amoonguss / 敗露球菇*) alongside its Nature/Ability in a clean, legible grid layout.

---

## Context & constraints

- **Chinese Name Mapping:** The database stores Chinese translations in `nameZh` (Traditional Chinese). Set inputs can be in English, Traditional Chinese, or Simplified Chinese.
- **Item List Source:** Since there is no `items` table in the database, item names will be matched against the standard Smogon Gen 9 items list retrieved via `@smogon/calc`'s `Generations.get(9).items`.
- **Performance:** Fuzzy matching is done on-demand during import; it does not block regular UI rendering.
- **Consistency:** The matching algorithm is shared across all 4 import entry points:
  1. Individual import in the calculator ([useCalculatorActions.ts](file:///Users/brianwong/Project/react/pokemon-champions-vgc/src/features/damage-calculator/hooks/useCalculatorActions.ts))
  2. Individual import in the team builder ([useTeamDetail.ts](file:///Users/brianwong/Project/react/pokemon-champions-vgc/src/features/teams/hooks/useTeamDetail.ts))
  3. Team import on the Teams page ([Teams/index.tsx](file:///Users/brianwong/Project/react/pokemon-champions-vgc/src/pages/Teams/index.tsx))
  4. Calculator opponent team scan-load database mapping ([DamageCalculator/index.tsx](file:///Users/brianwong/Project/react/pokemon-champions-vgc/src/pages/DamageCalculator/index.tsx))

---

## Simplified-to-Traditional Chinese Conversion

To support Simplified Chinese inputs matching against the Traditional Chinese database, we introduce a static mapping utility containing the common Simplified characters used in Pokémon names, items, abilities, and moves.

Example mapping slice:
```typescript
const SIMPLIFIED_TO_TRADITIONAL: Record<string, string> = {
  '龙': '龍', '喷': '噴', '针': '針', '宝': '寶', '吓': '嚇', '电': '電', '击': '擊', '鱼': '魚',
  // ... (comprehensive mapping for Pokémon terminology)
};

export function convertSCtoTC(str: string): string {
  return str.split('').map(char => SIMPLIFIED_TO_TRADITIONAL[char] || char).join('');
}
```

---

## Matching Algorithm

A central matcher helper resolves queries using the following logic:

1. **Exact Match Check (Case-Insensitive):** Normalize the query (lowercase, strip whitespace/hyphens) and check if it matches a candidate exactly.
2. **Language Detection:** Check if the query contains Chinese characters (`/[\u4e00-\u9fa5]/`).
3. **Normalization & SC-to-TC conversion:**
   * If Chinese: Convert SC to TC, strip spaces/punctuation.
   * If English: Strip hyphens, lowercase.
4. **Fuzzy Search (Levenshtein Distance):**
   * Compute similarity score: `(longerLength - distance) / longerLength`.
   * Accept the best candidate if its similarity score exceeds the threshold:
     * **English Threshold:** `0.75`
     * **Chinese Threshold:** `0.70` (Chinese terms are typically shorter, e.g. 3-4 chars, where a 1-character difference is more significant).

---

## UI Improvements: `TeamImportSelector`

The "Import from Team" selection grid currently displays:
- Nature (e.g. `Modest (+SpA, -Atk) / ...` truncated)
- Ability
- No species name text (forcing users to rely entirely on the image icon)

### Proposed Changes:
1. **Pass `pokemonList` Prop:** Pass the loaded `pokemonList` from the page container so the selector can look up `member.configuration.selectedId`.
2. **Render Species Name:** Add the species name prominently (e.g., `Amoonguss / 敗露球菇`) as the primary header on each card.
3. **Format Card Text:** Display the Nature and Ability as cleaner, smaller metadata elements to prevent text-wrapping and truncation bugs.

---

## Architecture

- **Create `src/features/pokemon/utils/showdown-matcher.ts`**
  - Contains `convertSCtoTC`, Levenshtein similarity metric, and shared match resolvers:
    - `matchSpecies(query, pokemonList)`
    - `matchMove(query, moveList)`
    - `matchAbility(query, abilityNames)`
    - `matchItem(query)`
- **Update Importers:**
  - Update `handleImportShowdown` in [useCalculatorActions.ts](file:///Users/brianwong/Project/react/pokemon-champions-vgc/src/features/damage-calculator/hooks/useCalculatorActions.ts)
  - Update `handleImportTeam` in [Teams/index.tsx](file:///Users/brianwong/Project/react/pokemon-champions-vgc/src/pages/Teams/index.tsx)
  - Update `handleImportSingleShowdown` / `handleImportTeamShowdown` in [useTeamDetail.ts](file:///Users/brianwong/Project/react/pokemon-champions-vgc/src/features/teams/hooks/useTeamDetail.ts)
  - Update `handleSaveOppTeam` in [DamageCalculator/index.tsx](file:///Users/brianwong/Project/react/pokemon-champions-vgc/src/pages/DamageCalculator/index.tsx)
- **Update UI Component:**
  - Update [TeamImportSelector.tsx](file:///Users/brianwong/Project/react/pokemon-champions-vgc/src/features/calculator/components/TeamImportSelector.tsx)

---

## Testing

- **Unit tests for `showdown-matcher.ts`:**
  - Test exact and fuzzy matches for English (e.g., `Amoongus` matches `Amoonguss`).
  - Test exact and fuzzy matches for Traditional and Simplified Chinese (e.g., `败露球菇` matches `敗露球菇`).
  - Test items, moves, and abilities matching.
- **Component test updates:**
  - Verify that the updated prop signature for `TeamImportSelector` builds correctly.

---

## Risks & open questions

- **Conflict on mega names:** Standard Showdown exports Mega names as `Charizard-Mega-Y` or `Charizard-Mega`. Our matching logic should map these correctly to `megaCharizardY` / `megaCharizardX` or standard Mega forms present in the DB. This is already partially handled by regexes, which will be integrated into the new matcher.
- **Showdown format language quirks:** Showdown set lines (like `Ability:`, `EVs:`, `Nature:`) are always in English in official exports, but some community tools translate these labels. Our parser in `showdown-parser.ts` handles the standard English labels; this slice assumes the line structure/labels remain standard, while the names themselves (like species/item/moves) can be in Chinese.
