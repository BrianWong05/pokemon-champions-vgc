# Showdown Import Fuzzy Matching & Team Selector UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement fuzzy name matching (including English and Simplified/Traditional Chinese matching) for Showdown set/team imports, and improve the calculator's "Import from Team" selector popover UX by resolving and rendering species names.

**Architecture:** 
1. A central `showdown-matcher.ts` utility handles language detection, Simplified-to-Traditional Chinese conversion, and Levenshtein similarity scoring for species, moves, abilities, and items.
2. Individual and team importers are updated to consume this matcher and report fuzzy resolutions.
3. A simple, self-dismissing toast notification is added to key page layouts to inform the user of auto-corrected terms.
4. `TeamImportSelector` is updated to take `pokemonList` as a prop and display resolved species names on its cards.

**Tech Stack:** React, TypeScript, Vitest, SQLite / Drizzle.

## Global Constraints

- **Chinese Name Mapping:** Database translations are stored in Traditional Chinese (`nameZh` column). Simplified Chinese inputs must be translated to Traditional Chinese before querying.
- **Item List:** Item matching uses `@smogon/calc`'s `Generations.get(9).items` list.
- **Notifications:** Show corrections via a visual temporary toast notification when fuzzy matching resolves a typo.
- **TDD:** Write unit tests for new utility modules first, verifying failure, then implement.

---

### Task 1: Importer Fuzzy Match Utility

**Files:**
- Create: `src/features/pokemon/utils/showdown-matcher.ts`
- Create: `src/features/pokemon/utils/showdown-matcher.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface MatchResult<T> {
    match: T;
    originalQuery: string;
    resolvedName: string;
    isFuzzy: boolean;
  }
  export function convertSCtoTC(str: string): string;
  export function matchSpecies(query: string, pokemonList: any[]): MatchResult<any> | null;
  export function matchMove(query: string, moveList: any[]): MatchResult<any> | null;
  export function matchAbility(query: string, abilityNames: string[]): MatchResult<string> | null;
  export function matchItem(query: string): MatchResult<string> | null;
  ```

- [ ] **Step 1: Write the failing unit tests**
  Create `src/features/pokemon/utils/showdown-matcher.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { convertSCtoTC, matchSpecies, matchMove, matchAbility, matchItem } from './showdown-matcher';

  describe('showdown-matcher', () => {
    const mockPokemonList = [
      { id: 591, nameEn: 'Amoonguss', nameZh: '敗露球菇' },
      { id: 6, nameEn: 'Charizard', nameZh: '噴火龍' },
      { id: 10035, nameEn: 'Mega Charizard Y', nameZh: '超級噴火龍Y' }
    ];
    const mockMoveList = [
      { id: 1, nameEn: 'Spore', nameZh: '蘑菇孢子' },
      { id: 2, nameEn: 'U-turn', nameZh: '急速折返' }
    ];

    it('translates SC to TC', () => {
      expect(convertSCtoTC('败露球菇')).toBe('敗露球菇');
      expect(convertSCtoTC('喷火龙')).toBe('噴火龍');
    });

    it('matches species exactly and fuzzily in English', () => {
      const res = matchSpecies('Amoongus', mockPokemonList);
      expect(res).not.toBeNull();
      expect(res!.match.id).toBe(591);
      expect(res!.isFuzzy).toBe(true);
    });

    it('matches species exactly and fuzzily in Chinese (SC & TC)', () => {
      const res1 = matchSpecies('败露球菇', mockPokemonList);
      expect(res1!.match.id).toBe(591);
      expect(res1!.isFuzzy).toBe(false); // Exact match after SC->TC conversion

      const res2 = matchSpecies('败露菇', mockPokemonList);
      expect(res2!.match.id).toBe(591);
      expect(res2!.isFuzzy).toBe(true);
    });

    it('matches Megas correctly using regex rules in Chinese', () => {
      const res = matchSpecies('噴火龍-Mega-Y', mockPokemonList);
      expect(res!.match.id).toBe(10035);
    });

    it('matches moves fuzzily', () => {
      const res = matchMove('Uturn', mockMoveList);
      expect(res!.match.nameEn).toBe('U-turn');
    });
  });
  ```

- [ ] **Step 2: Run test suite to verify it fails**
  Run: `npx vitest src/features/pokemon/utils/showdown-matcher.test.ts`
  Expected: Fail with imports missing/undefined.

- [ ] **Step 3: Implement utility code**
  Create `src/features/pokemon/utils/showdown-matcher.ts` with SC-to-TC dictionary, Levenshtein function, and matcher hooks:
  ```typescript
  import { Generations } from '@smogon/calc';

  const SIMPLIFIED_TO_TRADITIONAL: Record<string, string> = {
    '龙': '龍', '喷': '噴', '针': '針', '宝': '寶', '吓': '嚇', '电': '電', '击': '擊', '鱼': '魚',
    '鸟': '鳥', '兰': '蘭', '丽': '麗', '亚': '亞', '败': '敗', '球': '球', '菇': '菇', '发': '髮',
    '药': '藥', '草': '草', '虫': '蟲', '兽': '獸', '极': '極', '速': '速', '折': '折', '返': '返',
    '无': '無', '线': '線', '盖': '蓋', '罗': '羅', '双': '雙', '翼': '翼', '钢': '鋼', '铁': '鐵',
    '银': '銀', '铜': '銅', '金': '金', '钟': '鐘', '锋': '鋒', '剑': '劍', '盾': '盾', '铠': '鎧'
  };

  export function convertSCtoTC(str: string): string {
    return str.split('').map(char => SIMPLIFIED_TO_TRADITIONAL[char] || char).join('');
  }

  function getLevenshteinDistance(a: string, b: string): number {
    const tmp: number[][] = [];
    for (let i = 0; i <= a.length; i++) tmp[i] = [i];
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        tmp[i][j] = Math.min(
          tmp[i - 1][j] + 1,
          tmp[i][j - 1] + 1,
          tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return tmp[a.length][b.length];
  }

  function getSimilarity(s1: string, s2: string): number {
    let longer = s1, shorter = s2;
    if (s1.length < s2.length) { longer = s2; shorter = s1; }
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    return (longerLength - getLevenshteinDistance(longer, shorter)) / longerLength;
  }

  export interface MatchResult<T> {
    match: T;
    originalQuery: string;
    resolvedName: string;
    isFuzzy: boolean;
  }

  function normalize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function normalizeZh(str: string): string {
    return convertSCtoTC(str).replace(/\s+/g, '');
  }

  export function matchSpecies(query: string, pokemonList: any[]): MatchResult<any> | null {
    if (!query) return null;
    const isChinese = /[\u4e00-\u9fa5]/.test(query);

    // Regex for Mega translation in Chinese/English
    if (isChinese) {
      const megaMatch = query.match(/^超級(.+)|(.+)(mega|超級|超|m)(x|y)?$/i);
      if (megaMatch) {
        const base = (megaMatch[1] || megaMatch[2] || '').trim();
        const suffix = (megaMatch[4] || '').toUpperCase();
        const translatedQuery = `超級${convertSCtoTC(base)}${suffix}`;
        const exact = pokemonList.find(p => p.nameZh === translatedQuery || normalizeZh(p.nameZh || '') === normalizeZh(translatedQuery));
        if (exact) return { match: exact, originalQuery: query, resolvedName: exact.nameZh || exact.nameEn, isFuzzy: true };
      }
    }

    if (isChinese) {
      const tcQuery = normalizeZh(query);
      const exact = pokemonList.find(p => p.nameZh && normalizeZh(p.nameZh) === tcQuery);
      if (exact) return { match: exact, originalQuery: query, resolvedName: exact.nameZh || exact.nameEn, isFuzzy: false };

      // Fuzzy matching Chinese
      let bestMatch: any = null, maxSim = 0.0;
      for (const p of pokemonList) {
        if (!p.nameZh) continue;
        const sim = getSimilarity(tcQuery, normalizeZh(p.nameZh));
        if (sim > maxSim) { maxSim = sim; bestMatch = p; }
      }
      if (bestMatch && maxSim >= 0.70) {
        return { match: bestMatch, originalQuery: query, resolvedName: bestMatch.nameZh || bestMatch.nameEn, isFuzzy: true };
      }
    } else {
      const normQuery = normalize(query);
      
      // Handle standard English Megas
      const megaMatch = normQuery.match(/^([a-z]+)mega([xy])?$/);
      let searchNorm = normQuery;
      if (megaMatch) {
        searchNorm = `mega${megaMatch[1]}${megaMatch[2] || ''}`;
      }

      const exact = pokemonList.find(p => normalize(p.nameEn) === searchNorm || normalize(p.identifier) === searchNorm);
      if (exact) return { match: exact, originalQuery: query, resolvedName: exact.nameEn, isFuzzy: false };

      // Fuzzy matching English
      let bestMatch: any = null, maxSim = 0.0;
      for (const p of pokemonList) {
        const sim = Math.max(getSimilarity(normQuery, normalize(p.nameEn)), getSimilarity(normQuery, normalize(p.identifier)));
        if (sim > maxSim) { maxSim = sim; bestMatch = p; }
      }
      if (bestMatch && maxSim >= 0.75) {
        return { match: bestMatch, originalQuery: query, resolvedName: bestMatch.nameEn, isFuzzy: true };
      }
    }
    return null;
  }

  export function matchMove(query: string, moveList: any[]): MatchResult<any> | null {
    if (!query) return null;
    const isChinese = /[\u4e00-\u9fa5]/.test(query);

    if (isChinese) {
      const tcQuery = normalizeZh(query);
      const exact = moveList.find(m => m.nameZh && normalizeZh(m.nameZh) === tcQuery);
      if (exact) return { match: exact, originalQuery: query, resolvedName: exact.nameZh || exact.nameEn, isFuzzy: false };

      let bestMatch: any = null, maxSim = 0.0;
      for (const m of moveList) {
        if (!m.nameZh) continue;
        const sim = getSimilarity(tcQuery, normalizeZh(m.nameZh));
        if (sim > maxSim) { maxSim = sim; bestMatch = m; }
      }
      if (bestMatch && maxSim >= 0.70) {
        return { match: bestMatch, originalQuery: query, resolvedName: bestMatch.nameZh || bestMatch.nameEn, isFuzzy: true };
      }
    } else {
      const normQuery = normalize(query);
      const exact = moveList.find(m => normalize(m.nameEn) === normQuery);
      if (exact) return { match: exact, originalQuery: query, resolvedName: exact.nameEn, isFuzzy: false };

      let bestMatch: any = null, maxSim = 0.0;
      for (const m of moveList) {
        const sim = getSimilarity(normQuery, normalize(m.nameEn));
        if (sim > maxSim) { maxSim = sim; bestMatch = m; }
      }
      if (bestMatch && maxSim >= 0.75) {
        return { match: bestMatch, originalQuery: query, resolvedName: bestMatch.nameEn, isFuzzy: true };
      }
    }
    return null;
  }

  export function matchAbility(query: string, abilityNames: string[]): MatchResult<string> | null {
    if (!query) return null;
    const isChinese = /[\u4e00-\u9fa5]/.test(query);
    const tcQuery = isChinese ? normalizeZh(query) : normalize(query);

    const exact = abilityNames.find(a => (isChinese ? normalizeZh(a) : normalize(a)) === tcQuery);
    if (exact) return { match: exact, originalQuery: query, resolvedName: exact, isFuzzy: false };

    let bestMatch: string | null = null, maxSim = 0.0;
    for (const a of abilityNames) {
      const sim = getSimilarity(tcQuery, isChinese ? normalizeZh(a) : normalize(a));
      if (sim > maxSim) { maxSim = sim; bestMatch = a; }
    }
    const thresh = isChinese ? 0.70 : 0.75;
    if (bestMatch && maxSim >= thresh) {
      return { match: bestMatch, originalQuery: query, resolvedName: bestMatch, isFuzzy: true };
    }
    return null;
  }

  const allItems = Array.from(Generations.get(9).items).map(item => item.name);
  export function matchItem(query: string): MatchResult<string> | null {
    if (!query || query.toLowerCase() === 'none') return null;
    const isChinese = /[\u4e00-\u9fa5]/.test(query);
    if (isChinese) {
      // Items are not translated in db, so we store standard string or attempt English conversion
      return { match: query, originalQuery: query, resolvedName: query, isFuzzy: false };
    }
    const normQuery = normalize(query);
    const exact = allItems.find(item => normalize(item) === normQuery);
    if (exact) return { match: exact, originalQuery: query, resolvedName: exact, isFuzzy: false };

    let bestMatch: string | null = null, maxSim = 0.0;
    for (const item of allItems) {
      const sim = getSimilarity(normQuery, normalize(item));
      if (sim > maxSim) { maxSim = sim; bestMatch = item; }
    }
    if (bestMatch && maxSim >= 0.75) {
      return { match: bestMatch, originalQuery: query, resolvedName: bestMatch, isFuzzy: true };
    }
    return null;
  }
  ```

- [ ] **Step 4: Verify test passes**
  Run: `npx vitest src/features/pokemon/utils/showdown-matcher.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/features/pokemon/utils/showdown-matcher.ts src/features/pokemon/utils/showdown-matcher.test.ts
  git commit -m "feat: add showdown-matcher utility with fuzzy matching & Chinese support"
  ```

---

### Task 2: Individual Importers & Calculator Toast System

**Files:**
- Modify: `src/features/damage-calculator/hooks/useCalculatorActions.ts` (fuzzy-match in `handleImportShowdown`)
- Modify: `src/features/teams/hooks/useTeamDetail.ts` (fuzzy-match in `handleImportSingleShowdown`)
- Modify: `src/pages/DamageCalculator/index.tsx` (add temporary Toast state and UI rendering)
- Modify: `src/pages/TeamDetail/index.tsx` (add temporary Toast state and UI rendering)

- [ ] **Step 1: Wire fuzzy match into useCalculatorActions.ts**
  Consumes: `matchSpecies`, `matchAbility`, `matchMove`, `matchItem`
  Modify `handleImportShowdown`:
  Replace the name resolution code with:
  ```typescript
  const speciesMatch = matchSpecies(set.species, pokemonList);
  if (!speciesMatch) {
    alert(`Could not find Pokémon matching "${set.species}"`);
    return;
  }
  const p = speciesMatch.match;
  const corrections: string[] = [];
  if (speciesMatch.isFuzzy) {
    corrections.push(`Pokémon: ${speciesMatch.originalQuery} ➔ ${speciesMatch.resolvedName}`);
  }
  ```
  And similarly, for moves:
  ```typescript
  const movesData = set.moves.map(mName => {
    const mm = matchMove(mName, moveList);
    if (mm) {
      if (mm.isFuzzy) corrections.push(`Move: ${mm.originalQuery} ➔ ${mm.resolvedName}`);
      return mm.match;
    }
    return null;
  });
  ```
  And abilities:
  ```typescript
  const resolvedAbility = set.ability ? matchAbility(set.ability, abilityNames) : null;
  let activeAbility = abilityNames[0] || null;
  if (resolvedAbility) {
    activeAbility = resolvedAbility.match;
    if (resolvedAbility.isFuzzy) corrections.push(`Ability: ${resolvedAbility.originalQuery} ➔ ${resolvedAbility.resolvedName}`);
  }
  ```
  And items:
  ```typescript
  const resolvedItem = set.item ? matchItem(set.item) : null;
  let item = set.item;
  if (resolvedItem) {
    item = resolvedItem.match;
    if (resolvedItem.isFuzzy) corrections.push(`Item: ${resolvedItem.originalQuery} ➔ ${resolvedItem.resolvedName}`);
  }
  ```
  Pass the corrections array out or alert them.
  Wait, let's update `onImportShowdown` in `PokemonConfigForm.tsx` to pass the corrections back so the parent page can toast them.

- [ ] **Step 2: Add inline Toast UI Component in pages**
  In `src/pages/DamageCalculator/index.tsx`, add:
  ```typescript
  const [toast, setToast] = useState<string | null>(null);
  ```
  Render at the top or bottom of the template:
  ```tsx
  {toast && (
    <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-gray-800 animate-bounce flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
      <span>{toast}</span>
    </div>
  )}
  ```
  Trigger it when import returns corrections:
  ```typescript
  // In Parent Page handler:
  if (corrections.length > 0) {
    setToast(`Auto-corrected:\n${corrections.join('\n')}`);
    setTimeout(() => setToast(null), 4000);
  }
  ```

- [ ] **Step 3: Repeat matching logic in useTeamDetail.ts**
  Update `handleImportSingleShowdown` in `src/features/teams/hooks/useTeamDetail.ts` with same `showdown-matcher` logic. Report any corrections via the page's toast banner.

- [ ] **Step 4: Run full vitest suite**
  Run: `npx vitest`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/features/damage-calculator/hooks/useCalculatorActions.ts src/features/teams/hooks/useTeamDetail.ts src/pages/DamageCalculator/index.tsx src/pages/TeamDetail/index.tsx
  git commit -m "feat: integrate fuzzy matching and add auto-correction toast notifications to single importers"
  ```

---

### Task 3: Team Importers Fuzzy Matching

**Files:**
- Modify: `src/pages/Teams/index.tsx` (fuzzy-match in `handleImportTeam`)
- Modify: `src/pages/DamageCalculator/index.tsx` (fuzzy-match in `handleSaveOppTeam` from scanned frame)

- [ ] **Step 1: Update TeamsPage handleImportTeam**
  Modify `handleImportTeam` in `src/pages/Teams/index.tsx` to match using `showdown-matcher` methods (`matchSpecies`, `matchMove`, `matchAbility`, `matchItem`).
  Compile a list of corrections for all 6 members and show them on the Teams index page via a newly-added `toast` banner.

- [ ] **Step 2: Update opponent scan loader in DamageCalculatorPage**
  Modify `handleSaveOppTeam` in `src/pages/DamageCalculator/index.tsx` to resolve scanned opponent cards via `showdown-matcher` (making it robust to OCR spelling errors or translations).

- [ ] **Step 3: Run verification tests**
  Run: `npx vitest`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add src/pages/Teams/index.tsx src/pages/DamageCalculator/index.tsx
  git commit -m "feat: extend fuzzy matching to team imports and scan opponent team saver"
  ```

---

### Task 4: Team Import Selector UX Improvements

**Files:**
- Modify: `src/components/organisms/PokemonConfigForm.tsx` (pass `pokemonList` to `TeamImportSelector`)
- Modify: `src/features/calculator/components/TeamImportSelector.tsx` (render Species name and update layout)

- [ ] **Step 1: Pass pokemonList prop**
  Update `src/components/organisms/PokemonConfigForm.tsx`:
  ```typescript
  <TeamImportSelector 
    pokemonList={pokemonList}
    onSelect={(loadedConfig) => { ... }}
    ...
  />
  ```

- [ ] **Step 2: Update TeamImportSelector component**
  Modify `src/features/calculator/components/TeamImportSelector.tsx`:
  Update props interface:
  ```typescript
  interface TeamImportSelectorProps {
    pokemonList: PokemonBaseStats[];
    onSelect: (config: PokemonConfig) => void;
    onClose: () => void;
  }
  ```
  Inside the map loop for `selectedTeam?.members.map(member => ...)`:
  Find the species:
  ```typescript
  const p = pokemonList.find(poke => poke.id === member.configuration.selectedId);
  const displayName = p ? (p.nameZh ? `${p.nameZh} / ${p.nameEn}` : p.nameEn) : 'Unknown Pokémon';
  ```
  Render `displayName` as a bold, readable heading above the Nature metadata:
  ```tsx
  <span className="text-[11px] font-extrabold text-gray-800 line-clamp-1 w-full text-center mt-1">
    {displayName}
  </span>
  <span className="text-[9px] text-gray-400 truncate w-full text-center leading-none mt-0.5">
    {member.configuration.nature} • {member.configuration.activeAbility || 'No Ability'}
  </span>
  ```

- [ ] **Step 3: Run check on typescript compilation**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation, no type mismatches.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/organisms/PokemonConfigForm.tsx src/features/calculator/components/TeamImportSelector.tsx
  git commit -m "flat: improve TeamImportSelector UX by showing species names (EN/ZH) and tidy layouts"
  ```
