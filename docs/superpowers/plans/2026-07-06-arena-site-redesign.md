# Arena Whole-Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page, desktop and mobile, wears the Arena VGC Design System (dark competitive HUD) — Phase 1 re-skins the desktop in place, Phase 2 ports the four remaining mobile screens.

**Architecture:** Phase 1 exposes the existing Arena CSS tokens (`src/design-system/arena/tokens.css`) to Tailwind v4 via an `@theme inline` block, then sweeps every desktop file replacing light-theme utility classes per a fixed mapping table — structure, grids, and modals unchanged. Phase 2 adds `Button`/`StatChip`/6 icons to the local Arena kit, then builds four mobile screens that branch by `useIsMobile` exactly like `ArenaCalculator` does, reusing each page's existing hooks/handlers.

**Tech Stack:** React 19, Tailwind v4 (`@tailwindcss/vite`, zero-config), react-router 7, vitest + testing-library, existing `src/design-system/arena` components.

**Spec:** `docs/superpowers/specs/2026-07-06-arena-site-redesign-design.md`

## Global Constraints

- Visual-only change: zero behavior changes. The guard is the existing test suite (245 tests / 45 files green on branch `feat/arena-site-redesign` baseline) plus per-task preview checks. If a test asserts an old class string, update the assertion to the new class — never change component behavior to satisfy a test.
- Do NOT touch: `src/design-system/arena/*` visuals (Phase 2 only adds new files/exports), `src/features/damage-calculator/components/mobile/*`, `src/components/templates/ArenaShell.tsx` — these are already Arena-dark.
- Sentence case in all product copy you touch: "Create new team", not "Create New Team". No exclamation marks, no emoji. 11px all-caps micro-labels are the one exception.
- One accent. Blue/indigo/purple/green *action* colors all collapse to `accent`. Green/red/amber are reserved for semantics: safe (survives/success), danger (KO/destructive/error), field (weather/field effects/warnings).
- Flat elevation: remove `shadow-sm/md/lg/xl/2xl` from cards (borders do the lifting). Keep shadows only on floating chrome: modals/popovers use `shadow-[var(--shadow-pop)]`.
- Radii: cards `rounded-xl` (12px), inputs/chips/small buttons `rounded-lg` (8px), modals/sheets `rounded-2xl` (16px), pills `rounded-full`.
- Disabled state = 45% opacity (`disabled:opacity-45`), not a gray fill.
- Commit after every task with the repo's `feat:`/`docs:` style and `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

### The class mapping table (canonical for every sweep task)

Apply mechanically unless a task notes a file-specific exception. "→" means replace the class.

| Old (light) | New (Arena) |
|---|---|
| `bg-gray-50` as page/section wrapper | `bg-page` (usually deletable — body is dark after Task 1) |
| `bg-gray-50`, `bg-gray-50/50`, `bg-gray-100`, `bg-gray-200` as panel/track/pill fill | `bg-inset` |
| `bg-white` (cards, dropdowns, inputs, modals) | `bg-card` |
| `hover:bg-gray-50`, `hover:bg-gray-100`, `hover:bg-slate-200` | `hover:bg-raise` |
| `bg-slate-100` | `bg-inset` |
| `border-gray-50`, `border-gray-100`, `border-gray-200`, `divide-gray-100` | `border-line` / `divide-line` |
| `border-gray-300`, `border-gray-400`, `border-blue-200` (inputs) | `border-line-2` |
| bare `border`/`border-t`/`border-b` with no color | add `border-line` (Tailwind v4 defaults to currentColor) |
| `text-gray-800`, `text-gray-900`, `text-blue-900` (body headings) | `text-ink-1` |
| `text-gray-600`, `text-gray-700`, `text-blue-800` (in info boxes) | `text-ink-2` |
| `text-gray-500` | `text-ink-3` |
| `text-gray-300`, `text-gray-400`, `placeholder:text-gray-300` | `text-ink-4` / `placeholder:text-ink-4` |
| solid action fills: `bg-blue-600`, `bg-blue-500`, `bg-indigo-600`, `bg-purple-600`, `bg-green-600` (+ their `hover:*-700` variants) | `bg-accent text-accent-ink hover:bg-accent-hover` |
| action tints: `bg-blue-50`, `bg-indigo-50`, `bg-purple-50` (+ `hover:*-100`) | `bg-accent-soft text-accent hover:bg-accent-soft` (add `border border-accent-soft-line` where the element had a border) |
| action text/links: `text-blue-500/600/700`, `text-indigo-*`, `text-purple-*` (+ hover variants) | `text-accent hover:text-accent-hover` |
| `focus:ring-blue-500`, `focus:ring-blue-400`, `focus:ring-blue-500/20`, `focus:border-blue-500/400` | `focus:ring-accent focus:border-accent` (keep ring width as-is) |
| destructive/error: `text-red-500/600` (+ hovers) | `text-danger` |
| `bg-red-50`, `hover:bg-red-50/100`, `border-red-100` | `bg-danger-soft` / `hover:bg-danger-soft` / `border-danger-line` |
| solid `bg-red-500/600` action fills | `bg-danger-soft text-danger border border-danger-line` |
| success: `bg-green-100 text-green-700`, `text-green-500/600/700`, `bg-green-200` | `bg-safe-soft text-safe` / `text-safe` |
| warning/amber/yellow: `text-amber-600/700`, `bg-amber-50/50`, `border-amber-100`, `text-yellow-*`, `bg-yellow-*` | `text-field`, `bg-field-soft`, `border-field-line` |
| emerald: `bg-emerald-600 hover:bg-emerald-700`, `text-emerald-600`, `border-emerald-200`, `hover:bg-emerald-50` | safe tokens: `bg-safe-soft text-safe border-safe-line hover:bg-safe-soft` |
| `text-white` on an accent/colored fill | `text-accent-ink` |
| `bg-black/40`, `bg-black/50` (modal scrims) | `bg-black/60` |
| `accent-blue-600`, `accent-indigo-600` (range inputs) | `accent-accent` |
| `ring-blue-500` (selection) | `ring-accent` |
| `disabled:bg-gray-400`, `disabled:opacity-50` | `disabled:opacity-45` |
| `shadow-sm/md/lg/xl/2xl`, `hover:shadow-xl` on cards/inputs/buttons | delete |
| `shadow-2xl` on modal/popover panels | `shadow-[var(--shadow-pop)]` |
| arbitrary glow shadows `shadow-[0_0_8px_rgba(...)]` | delete |

Fonts: headings get `font-display`; Showdown import/export textareas get `font-mono` (the theme maps `font-mono` to JetBrains Mono); body inherits Manrope from the Task-1 base style.

---

### Task 1: Arena theme utilities + dark base

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: Tailwind utilities used by every later task: `bg-page`, `bg-card`, `bg-inset`, `bg-raise`, `border-line`, `border-line-2`, `border-line-3`, `text-ink-1..4`, `accent`/`accent-hover`/`accent-press`/`accent-ink`/`accent-soft`/`accent-soft-line`, `safe`/`safe-soft`/`safe-line`, `danger`/`danger-soft`/`danger-line`, `field`/`field-soft`/`field-line` (each color name works with any color utility: `bg-`, `text-`, `border-`, `ring-`, `accent-`, `divide-`), plus `font-display`, `font-ui`, and `font-mono` (now JetBrains Mono).

- [ ] **Step 1: Add the `@theme` block and dark base to `src/index.css`**

Replace the two `@import` lines at the top with:

```css
@import "tailwindcss";
@import "./design-system/arena/tokens.css";

/* Arena tokens exposed as Tailwind utilities (bg-card, text-ink-2, border-line, …) */
@theme inline {
  --color-page: var(--bg-page);
  --color-card: var(--surface-card);
  --color-inset: var(--surface-inset);
  --color-raise: var(--surface-hover);
  --color-line: var(--line-1);
  --color-line-2: var(--line-2);
  --color-line-3: var(--line-3);
  --color-ink-1: var(--ink-1);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-ink-4: var(--ink-4);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-press: var(--accent-press);
  --color-accent-ink: var(--accent-ink);
  --color-accent-soft: var(--accent-soft);
  --color-accent-soft-line: var(--accent-soft-line);
  --color-safe: var(--safe);
  --color-safe-soft: var(--safe-soft);
  --color-safe-line: var(--safe-line);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-danger-line: var(--danger-line);
  --color-field: var(--field);
  --color-field-soft: var(--field-soft);
  --color-field-line: var(--field-line);
}

/* Font utilities. Literal values (NOT var()) — tokens.css defines the same
   names on :root, so var() self-references would be circular. font-mono
   deliberately overrides Tailwind's default. */
@theme {
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-ui: 'Manrope', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

@layer base {
  :root {
    color-scheme: dark; /* native selects/checkboxes/scrollbars render dark */
  }
  body {
    background-color: var(--bg-page);
    color: var(--text-body);
    font-family: var(--font-ui);
  }
}
```

Keep the existing `slideIn` keyframes / `.animate-toast-slide-in` rule below, unchanged.

- [ ] **Step 2: Verify build + tests**

Run: `npm test` → expected: 45 files / 245 tests pass.
Run: `npm run build` → expected: clean build, no unknown-utility CSS errors.

- [ ] **Step 3: Verify in preview**

Start the dev server (`preview_start`), open `/` at desktop width. Expected: page body is near-black navy behind the (still light) content; native select dropdowns render dark. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat: expose Arena tokens as Tailwind theme + dark base"
```

---

### Task 2: Desktop shell re-skin (Layout)

**Files:**
- Modify: `src/components/templates/Layout.tsx`

**Interfaces:**
- Consumes: Task 1 utilities.
- Produces: nothing new — same component contract (`<Layout/>` route element).

- [ ] **Step 1: Re-skin the desktop branch of Layout.tsx**

Replace `getLinkClass` and the desktop JSX (keep the `isMobile` early-return and all logic identical):

```tsx
  const getLinkClass = (path: string, exact: boolean = true) => {
    const baseClass = "px-4 py-2 rounded-lg transition-colors";
    const isActive = exact
      ? location.pathname === path
      : location.pathname.startsWith(path);

    return isActive
      ? `${baseClass} bg-accent-soft text-accent border border-accent-soft-line font-semibold`
      : `${baseClass} text-ink-2 border border-transparent hover:bg-inset hover:text-ink-1`;
  };

  if (isMobile) return <ArenaShell />;

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <header className="bg-[var(--bg-appbar)] backdrop-blur border-b border-line sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold font-display text-ink-1 tracking-tight">Pokemon Champions VGC</h1>
          <nav className="flex gap-2 items-center">
            <Link to="/" className={getLinkClass('/')}>
              Damage calculator
            </Link>
            <Link to="/teams" className={getLinkClass('/teams', false)}>
              Teams
            </Link>
            <Link to="/ev-converter" className={getLinkClass('/ev-converter')}>
              EV/SP converter
            </Link>
            <Link to="/speed-tiers" className={getLinkClass('/speed-tiers')}>
              Speed tiers
            </Link>
            <label className="flex items-center gap-2 ml-2 text-sm text-ink-3">
              Regulation
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="rounded-lg px-2 py-1 bg-inset text-ink-1 border border-line-2"
              >
                {formatOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-ink-4 py-3 px-4">
        Not affiliated with Nintendo, Game Freak, or The Pokémon Company.
      </footer>
    </div>
  );
```

- [ ] **Step 2: Verify**

Run: `npm test` → pass. Preview `/` at desktop width: dark sticky header, indigo-tinted active nav pill, dark regulation select, dark page.

- [ ] **Step 3: Commit**

```bash
git add src/components/templates/Layout.tsx
git commit -m "feat: Arena dark desktop shell (header, nav, footer)"
```

---

### Task 3: Core atoms

**Files:**
- Modify: `src/components/atoms/Typography.tsx`, `src/components/atoms/Modal.tsx`, `src/components/atoms/Badge.tsx`, `src/components/atoms/Slider.tsx`, `src/components/atoms/ItemImage.tsx`, `src/components/atoms/ToastNotification.tsx`

**Interfaces:**
- Consumes: Task 1 utilities. Produces: same component contracts, dark visuals — every organism/page task after this assumes atoms are dark.

- [ ] **Step 1: Typography.tsx** — colors live in the JS variant map. Swap only color tokens and add fonts; keep every size/weight class as-is:
  - h1 variant: color → `text-ink-1`, add `font-display tracking-tight`
  - h2 variant: color → `text-ink-1`, add `font-display`
  - body variant: color → `text-ink-2`
  - label variant: color → `text-ink-3`

- [ ] **Step 2: Modal.tsx** — backdrop `bg-black/50` → `bg-black/60`; panel `bg-white shadow-2xl border-gray-100` → `bg-card border border-line shadow-[var(--shadow-pop)]` and panel radius → `rounded-2xl`; title `text-gray-800` → `text-ink-1 font-display`; close button `text-gray-400 hover:bg-gray-100` → `text-ink-3 hover:bg-inset`.

- [ ] **Step 3: Badge.tsx** — `bg-blue-100 text-blue-800` → `bg-accent-soft text-accent`.

- [ ] **Step 4: Slider.tsx** — `text-gray-500` → `text-ink-3`, `text-blue-600` → `text-accent`, `bg-gray-200` → `bg-inset`, `accent-blue-600` → `accent-accent`.

- [ ] **Step 5: ItemImage.tsx** — placeholder `bg-gray-100 border-gray-200 text-gray-400` → `bg-inset border-line text-ink-4`.

- [ ] **Step 6: ToastNotification.tsx** — already dark; re-tone to Arena: `bg-gray-900` → `bg-card`, `border-gray-800` → `border-line`, `text-white` → `text-ink-1`, `bg-green-400` dot → `bg-safe`, `shadow-2xl` → `shadow-[var(--shadow-pop)]`.

- [ ] **Step 7: Verify + commit**

Run: `npm test` → pass. Preview: open Teams page, trigger a modal (Import team) — dark panel on dark scrim.

```bash
git add src/components/atoms
git commit -m "feat: Arena re-skin of core atoms (Typography, Modal, Badge, Slider, ItemImage, Toast)"
```

---

### Task 4: Input + search molecules

**Files:**
- Modify: `src/components/molecules/NumberInput.tsx`, `StatInput.tsx`, `StatSlider.tsx`, `StatControlGroup.tsx`, `FormItem.tsx`, `PokemonSearchSelect.tsx`, `ItemSearchSelect.tsx`, `MoveSearchSelect.tsx`

**Interfaces:** same component contracts; dropdowns/inputs go dark.

- [ ] **Step 1: Apply the mapping table** to NumberInput, StatInput, StatSlider, StatControlGroup (its wrapper `bg-gray-50` → `bg-inset`). Inputs generally become: `bg-inset border-line-2 text-ink-1 focus:ring-accent focus:border-accent` with shadows deleted.

- [ ] **Step 2: FormItem.tsx** — rewrite the `isSelected` ternaries:
  - selected: `bg-blue-50 border-blue-500` → `bg-accent-soft border-accent-soft-line`, text `text-blue-700` → `text-accent`
  - unselected: `border-transparent hover:bg-gray-50 hover:border-gray-200` → `border-transparent hover:bg-raise hover:border-line`, text `text-gray-500` → `text-ink-3`

- [ ] **Step 3: The three search selects** — apply the table, then rewrite each conditional exactly:
  - Input text ternary (all three): selected → `text-accent`, plain → `text-ink-1`.
  - Dropdown container: `bg-white border-gray-200 shadow-lg` → `bg-card border-line shadow-[var(--shadow-pop)]`.
  - Active row ternary (all three): active → `bg-accent-soft text-accent`; inactive → `hover:bg-raise text-ink-1`.
  - MoveSearchSelect per-line ternaries: name active `text-blue-700`→`text-accent` / inactive `text-gray-900`→`text-ink-1`; nameZh active `text-blue-500`→`text-accent` / inactive `text-gray-500`→`text-ink-3`; damage-class/power active `text-blue-400`→`text-accent` / inactive `text-gray-400`→`text-ink-4`. Clear buttons `text-red-500 hover:text-red-700` → `text-danger hover:text-danger`.

- [ ] **Step 4: Verify + commit**

Run: `npm test` → pass. Preview `/`: open the Pokémon picker on desktop calculator — dark input, dark dropdown, accent active row.

```bash
git add src/components/molecules
git commit -m "feat: Arena re-skin of input and search-select molecules"
```

---

### Task 5: Stat + display molecules

**Files:**
- Modify: `src/components/molecules/ProgressBar.tsx`, `StatBar.tsx`, `StatValue.tsx`, `StatGrid.tsx`, `StatGridItem.tsx`, `TeamMemberStatDisplay.tsx`, `TierHeader.tsx`, `TypeBadge.tsx`, `StatConverterRow.tsx`

**Interfaces:** same contracts. `StatBar`'s `colorClass` prop keeps working — callers are re-pointed in Task 8b.

- [ ] **Step 1: ProgressBar.tsx** — `isOver` ternaries: over → `text-danger` + fill `bg-danger`; normal → label `text-ink-2`/`text-ink-3` + fill `bg-accent`. Track `bg-gray-200` → `bg-inset`.

- [ ] **Step 2: StatBar.tsx** — default `colorClass` `'bg-blue-500'` → `'bg-accent'`; label `text-gray-500` → `text-ink-3`, value `text-gray-900` → `text-ink-1`, track `bg-gray-100` → `bg-inset`.

- [ ] **Step 3: StatValue.tsx** — edit the `colorClasses` map: `red` → `text-danger`, `orange` → `text-field`, `default/gray` → `text-ink-2`, `blue` → `text-accent`. Add `font-display` to the numeric span.

- [ ] **Step 4: StatGrid.tsx** (heaviest file — rewrite each conditional exactly):
  - nature + button: boosted → `bg-danger-soft text-danger border border-danger-line` / idle → `bg-inset text-ink-4 hover:bg-raise`
  - nature − button: hindered → `bg-accent-soft text-accent border border-accent-soft-line` / idle → `bg-inset text-ink-4 hover:bg-raise`
  - stage value ternary: positive → `text-safe`, negative → `text-danger`, zero → `text-ink-4`
  - row total ternary: over → `text-danger`, boosted/invested → `text-accent`, plain → `text-ink-1`
  - SP/EV mode toggle spans: active → `text-accent`, inactive → `text-ink-4`
  - limit-toggle + over-limit total ternaries: over → `text-danger`, ok → `text-accent`
  - range inputs: `accent-blue-500` → `accent-accent`, tracks `bg-gray-100/200` → `bg-inset`
  - everything else per the table; delete `shadow-sm`.

- [ ] **Step 5: StatGridItem, TeamMemberStatDisplay, TierHeader, StatConverterRow** — apply the table. Specifics: StatGridItem `hover:bg-blue-50/30` → `hover:bg-raise`, card `bg-white` → `bg-card`, bare `border`/`border-t` → add `border-line`. TeamMemberStatDisplay total ternaries: boosted → `text-danger`, hindered → `text-accent`, plain → `text-ink-1`; over-limit footer → `text-danger` else `text-accent`. TierHeader `bg-gray-100` → `bg-inset`, bare `border-b` → `border-b border-line`.

- [ ] **Step 6: TypeBadge.tsx (molecule)** — switch solid fill to the Arena 16%-tint pill, keeping the TypeIcon + name structure. Replace the inline style + text class:

```tsx
// before: style={{ backgroundColor: color }} + className "... text-white"
const color = TYPE_COLORS[typeKey] ?? 'var(--type-normal)'; // was '#828282'
// pill:
style={{
  background: `color-mix(in srgb, ${color} 16%, transparent)`,
  border: `1px solid color-mix(in srgb, ${color} 42%, transparent)`,
  color,
}}
```

Remove `text-white` from the className. Keep size/padding classes as-is.

- [ ] **Step 7: Verify + commit**

Run: `npm test` → pass. Preview `/speed-tiers` and `/ev-converter`: tint type pills, dark stat rows.

```bash
git add src/components/molecules
git commit -m "feat: Arena re-skin of stat/display molecules (tint type pills, semantic stat colors)"
```

---

### Task 6: Calculator template + config panels

**Files:**
- Modify: `src/components/templates/DamageCalculatorTemplate.tsx`, `src/components/organisms/PokemonPanel.tsx`, `src/components/organisms/PokemonConfigForm.tsx`, `src/components/organisms/PokemonConfigForm/TopSection.tsx`, `src/components/organisms/PokemonConfigForm/MoveSection.tsx`, `src/components/organisms/PokemonConfigForm/MetadataSection.tsx`, `src/features/damage-calculator/components/AttackerPanel.tsx`, `src/features/damage-calculator/components/DefenderPanel.tsx`, `src/features/damage-calculator/components/BuildPresets.tsx`, `src/features/calculator/components/TeamImportSelector.tsx`, `src/pages/DamageCalculator/index.tsx`

**Interfaces:**
- `sideColor` prop values change at the SOURCE: AttackerPanel passes `sideColor="bg-accent"`, DefenderPanel passes `sideColor="bg-danger"`. PokemonConfigForm's fallback `sideColor || 'bg-blue-600'` → `sideColor || 'bg-accent'`.

- [ ] **Step 1: DamageCalculatorTemplate.tsx** — apply the table to the page wrapper (`bg-gray-50` → delete, body is dark), white cards → `bg-card border border-line rounded-xl` (shadows deleted), "Stat Formulas" info card `bg-blue-50 border-blue-100 text-blue-800` → `bg-card border-line text-ink-2` with the formula lines in `font-mono`. Then rewrite the segmented-control ternaries:
  - Field-condition groups (Weather, Field Auras, Terrain, Gravity) active state → `bg-field-soft text-field border border-field-line` — one amber field-effect voice; DROP the per-terrain color chain (Electric/Grassy/Misty/Psychic all use the same field tint).
  - Target Mode active state → `bg-accent-soft text-accent border border-accent-soft-line`.
  - All inactive states → `text-ink-3 hover:text-ink-1` on the group's `bg-inset` track.

- [ ] **Step 2: PokemonPanel.tsx** — table sweep (`bg-white shadow-lg border-gray-100` → `bg-card border-line`, indigo controls → accent, `accent-indigo-600` → `accent-accent`), then the crit-button ternary: active → `bg-danger-soft text-danger border border-danger-line` (glow shadow deleted); inactive → `bg-inset border-line-2 text-ink-4 hover:border-danger-line hover:text-danger`.

- [ ] **Step 3: PokemonConfigForm.tsx + sections** — table sweep across all four files. Specific rewrites:
  - Preset-row ternary: applied → `bg-safe-soft text-safe`; idle → `text-ink-2 hover:bg-accent-soft hover:text-accent`.
  - Popover panels `bg-white shadow-2xl/lg` → `bg-card border border-line shadow-[var(--shadow-pop)]`.
  - MetadataSection Aegislash stance ternary: Blade → `bg-danger-soft text-danger border-danger-line`; Shield → `bg-accent-soft text-accent border-accent-soft-line` (both glow shadows deleted). Manual-type-override amber box → `bg-field-soft border-field-line text-field`.
  - Toolbar pill buttons (Teams/Import/Export/Presets): indigo/purple/green/blue tints all → `bg-accent-soft text-accent hover:bg-accent-soft`.

- [ ] **Step 4: AttackerPanel/DefenderPanel/BuildPresets/TeamImportSelector/page** —
  - AttackerPanel: `sideColor="bg-blue-600"` → `sideColor="bg-accent"`. DefenderPanel: `sideColor="bg-red-600"` → `sideColor="bg-danger"`.
  - BuildPresets: `bg-slate-100 hover:bg-slate-200` → `bg-inset hover:bg-raise text-ink-2`; reset `text-red-600 hover:bg-red-50` → `text-danger hover:bg-danger-soft`; label `text-gray-500` → `text-ink-3`.
  - TeamImportSelector: table sweep (white/indigo tints → card/accent-soft). If `TeamImportSelector.test.tsx` asserts class strings, update those assertions.
  - `src/pages/DamageCalculator/index.tsx` desktop scan button: `bg-purple-600 text-white hover:bg-purple-700` → `bg-inset text-ink-1 border border-line-2 hover:bg-raise` and sentence-case its label if needed.

- [ ] **Step 5: Verify + commit**

Run: `npm test` → pass. Preview `/` desktop: dark two-column calculator, amber field-condition chips, accent attacker / danger defender stripes. Verify calc numbers unchanged for a known matchup (e.g. pick any attacker/defender/move before and after — same damage range).

```bash
git add src/components/templates/DamageCalculatorTemplate.tsx src/components/organisms src/features/damage-calculator/components src/features/calculator src/pages/DamageCalculator
git commit -m "feat: Arena re-skin of desktop calculator template and config panels"
```

---

### Task 7: ResultsPanel re-tone

**Files:**
- Modify: `src/components/organisms/ResultsPanel.tsx`

**Interfaces:** `themeColor` prop values become `'bg-accent'` (left/attacker column) and `'bg-danger'` (right/defender column); `DamageResult` export unchanged.

- [ ] **Step 1: Re-tone the already-dark panel to Arena navy**

Mechanical map for this file: `bg-gray-900` → `bg-card`; `border-gray-800` → `border-line`; `bg-gray-800/30|50|60` → `bg-inset`; `bg-gray-900/50` → `bg-page/50`; `text-gray-400/500/600/700` → `text-ink-3` (or `text-ink-4` for the dimmest); green (`text-green-400`, `bg-green-500`, `bg-green-500/10`, `border-green-500/20`) → safe tokens (`text-safe`, `bg-safe`, `bg-safe-soft`, `border-safe-line`); yellow → field tokens; red → danger tokens; blue/indigo accents (`border-blue-500`, `bg-blue-600/10`, `text-blue-400/500`, `text-indigo-400`, `bg-indigo-500/10`, `border-indigo-500/20`, `bg-indigo-500`) → accent tokens (`border-accent`, `bg-accent-soft`, `text-accent`, `border-accent-soft-line`, `bg-accent`); `shadow-[0_0_25px_rgba(59,130,246,0.15)]` → delete; `shadow-2xl` on the VS medallion → `shadow-[var(--shadow-pop)]`.

Three code-level rewrites:

1. `getKoStatus()` returned classes → `bg-safe-soft border-safe-line text-safe` / `bg-danger-soft border-danger-line text-danger` / `bg-field-soft border-field-line text-field`.
2. The HP-bar ternary and its `.replace()` trick — keep the mechanism, swap the palette:

```tsx
const barColor = pct > 50 ? 'bg-safe' : pct > 20 ? 'bg-field' : 'bg-danger';
// line ~78 keeps working because the new names still follow bg-X → text-X:
const textColor = barColor.replace('bg-', 'text-');
```

3. Active-move button ternary: active → `border-accent bg-accent-soft` (glow deleted); inactive → `hover:border-line-3 hover:bg-raise`.

Also: `themeColor` defaults/call sites in this file `'bg-blue-600'`/`'bg-red-600'` → `'bg-accent'`/`'bg-danger'`. Add `font-display` to the big damage-percent readouts.

- [ ] **Step 2: Verify + commit**

Run: `npm test` → pass. Preview `/` desktop with a full matchup: HP bars safe/field/danger, KO pill tinted, accent active-move outline.

```bash
git add src/components/organisms/ResultsPanel.tsx
git commit -m "feat: re-tone Battle Analysis panel to Arena navy + semantic colors"
```

---

### Task 8: Teams pages + all team/showdown modals

**Files:**
- Modify: `src/pages/Teams/index.tsx`, `src/pages/TeamDetail/index.tsx`, `src/features/teams/components/TeamHeader.tsx`, `src/features/teams/components/TeamMemberGrid.tsx`, `src/components/organisms/TeamExportModal.tsx`, `src/components/organisms/TeamShowdownImportModal.tsx`, `src/components/organisms/ShowdownImportModal.tsx`, `src/components/organisms/ShowdownExportModal.tsx`, `src/components/organisms/TeamMemberEditorModal.tsx`

- [ ] **Step 1: Teams page** — table sweep. Buttons: "Create new team" → `bg-accent text-accent-ink hover:bg-accent-hover`; "Import team" → `bg-accent-soft text-accent hover:bg-accent-soft`; "Scan team" → `bg-inset text-ink-1 border border-line-2 hover:bg-raise`; Save (create form) → accent primary with `disabled:opacity-45`. Team cards `bg-white shadow-md border-gray-200` → `bg-card border-line rounded-xl`; member tiles `bg-gray-50 border-gray-200` → `bg-inset border-line`; footer `bg-gray-50 border-t border-gray-200` → `bg-inset border-t border-line`; Edit link → `text-accent`, Export → `text-accent`, Delete → `text-danger hover:text-danger`; count pill `bg-gray-100 text-gray-500` → `bg-inset text-ink-3`. Sentence-case copy: "My Teams" → "Teams", "Create New Team" → "Create new team", "Import Team" → "Import team", "Scan Team" → "Scan team", "Edit Team" → "Edit".

- [ ] **Step 2: TeamDetail page** — `text-red-600` → `text-danger`, back link `text-blue-600 hover:underline` → `text-accent hover:text-accent-hover`.

- [ ] **Step 3: TeamHeader** — table sweep; dot-counter ternary: filled → `bg-accent`, empty → `bg-inset`. Confirm/cancel rename buttons → accent primary / `bg-inset text-ink-3 hover:bg-raise`.

- [ ] **Step 4: TeamMemberGrid** — table sweep; delete `hover:shadow-xl` (cards stay flat, hover = `hover:border-line-3`); add-member dashed card `border-gray-200 hover:border-blue-300` → `border-line-2 hover:border-accent-soft-line`, icon `text-gray-300 group-hover:text-blue-400` → `text-ink-4 group-hover:text-accent`; stat labels amber/indigo accents per table.

- [ ] **Step 5: The five modals** — table sweep on each. Textareas (Showdown paste/export) get `font-mono bg-inset border-line-2 text-ink-1`. Copy-button ternaries: copied → `bg-safe-soft text-safe`; idle → `bg-accent text-accent-ink hover:bg-accent-hover`. Error text → `text-danger`; error banner `bg-red-50` → `bg-danger-soft`. TeamShowdownImportModal info box `bg-blue-50 border-blue-100 text-blue-700` → `bg-accent-soft border-accent-soft-line text-accent`.

- [ ] **Step 6: Verify + commit**

Run: `npm test` → pass. Preview `/teams` + a team detail page: dark cards, tint pills, dark modals (create, import, export, member editor).

```bash
git add src/pages/Teams src/pages/TeamDetail src/features/teams/components src/components/organisms
git commit -m "feat: Arena re-skin of Teams, Team detail and showdown modals"
```

---

### Task 9: Speed tiers + EV/SP + NotFound

**Files:**
- Modify: `src/components/templates/SpeedTierTemplate.tsx`, `src/components/organisms/TierSection.tsx`, `src/components/organisms/PokemonDetailModal.tsx`, `src/components/organisms/EvSpForm.tsx`, `src/pages/EvSpConverter/index.tsx`, `src/pages/NotFound/index.tsx`

- [ ] **Step 1: SpeedTierTemplate + TierSection** — `text-gray-600/500` → `text-ink-2/ink-3`; TierSection `bg-gray-50/50 shadow-sm border` → `bg-card border border-line rounded-xl`.

- [ ] **Step 2: PokemonDetailModal** — table sweep (`bg-black/40` → `bg-black/60`, `bg-white shadow-2xl` → `bg-card border border-line rounded-2xl shadow-[var(--shadow-pop)]`). Replace the `statConfig` per-stat rainbow with the DS convention (accent = speed, muted = the rest):

```tsx
const statConfig = [
  { label: 'HP',  key: 'baseHp',      colorClass: 'bg-ink-3' },
  { label: 'Atk', key: 'baseAttack',  colorClass: 'bg-ink-3' },
  { label: 'Def', key: 'baseDefense', colorClass: 'bg-ink-3' },
  { label: 'SpA', key: 'baseSpAtk',   colorClass: 'bg-ink-3' },
  { label: 'SpD', key: 'baseSpDef',   colorClass: 'bg-ink-3' },
  { label: 'Spe', key: 'baseSpeed',   colorClass: 'bg-accent' },
];
```

(Keep the existing `key` names exactly as the file has them — only change `colorClass` values.)

- [ ] **Step 3: EvSpForm + EvSpConverter page** — table sweep. Reset button `bg-red-50 text-red-600 border-red-100 hover:bg-red-100` → `bg-danger-soft text-danger border-danger-line hover:bg-danger-soft`. Page: formula `<code>` → `bg-inset text-accent font-mono`; System-rules box `bg-blue-50 border-blue-100 text-blue-900/800` → `bg-card border-line`, heading `text-ink-1`, list `text-ink-2`.

- [ ] **Step 4: NotFound** — `text-gray-800/600` → `text-ink-1/ink-2` (+ `font-display` on the 404), button → accent primary, sentence-case "Return to home".

- [ ] **Step 5: Verify + commit**

Run: `npm test` → pass. Preview `/speed-tiers` (open a detail modal), `/ev-converter`, and a bad URL.

```bash
git add src/components/templates/SpeedTierTemplate.tsx src/components/organisms/TierSection.tsx src/components/organisms/PokemonDetailModal.tsx src/components/organisms/EvSpForm.tsx src/pages/EvSpConverter src/pages/NotFound
git commit -m "feat: Arena re-skin of speed tiers, EV/SP converter and 404"
```

---

### Task 10: Scan feature surfaces

**Files:**
- Modify: `src/features/scan/ScanTeamModal.tsx`, `src/features/scan/CropStep.tsx`, `src/features/scan/PokemonImagePicker.tsx`, `src/features/scan/OneTapCaptureToggle.tsx`

- [ ] **Step 1: ScanTeamModal** — table sweep, plus the three conditionals: side badge → `entry.side === 'player' ? 'bg-accent-soft text-accent' : 'bg-danger-soft text-danger'`; candidate selection → `entry.id === c.id ? 'ring-2 ring-accent' : 'hover:bg-raise'`; spinner → `border-line border-t-accent`. Bare-`border` footer buttons → `border border-line-2 text-ink-2 hover:bg-raise`. Warnings `text-amber-600` → `text-field`; engine select inherits dark `color-scheme`.

- [ ] **Step 2: CropStep** — instructions `text-gray-600` → `text-ink-2`; crop rect stays `border-blue-500 bg-blue-500/10` → `border-accent bg-accent-soft` ; buttons: primary → accent, Cancel bare `border` → `border border-line-2 text-ink-2 hover:bg-raise`.

- [ ] **Step 3: PokemonImagePicker** — container/input bare `border` → `border-line-2`; `hover:bg-blue-50` → `hover:bg-raise`; selected ring conditional `ring-2 ring-blue-500` → `ring-2 ring-accent`; hint `text-gray-400` → `text-ink-4`.

- [ ] **Step 4: OneTapCaptureToggle** — `bg-emerald-600 text-white hover:bg-emerald-700` → `bg-safe-soft text-safe border border-safe-line hover:bg-safe-soft`.

- [ ] **Step 5: Verify + commit**

Run: `npm test` → pass. Preview: open Scan team from `/teams` — dark workflow end to end.

```bash
git add src/features/scan
git commit -m "feat: Arena re-skin of team-scan workflow"
```

---

### Task 11: Phase-1 leftover audit + full verification

**Files:** none new — fixes stragglers found by the audit.

- [ ] **Step 1: Grep audit for surviving light classes**

Run:

```bash
grep -rnE '(bg|text|border|ring|divide|accent)-(gray|slate|blue|indigo|purple|green|red|amber|yellow|emerald|orange|pink|white)-?' src --include='*.tsx' -l | grep -v 'components/mobile' | grep -v 'design-system/arena'
```

Expected: empty (allowed exceptions: `bg-black/60` scrims, inline `TYPE_COLORS` hex values, and `ring-accent`-style already-converted names that the regex may catch — inspect matches, fix real stragglers with the mapping table).

- [ ] **Step 2: Full suite + build**

Run: `npm test` → 45 files / 245 tests pass. Run: `npm run build` → clean.

- [ ] **Step 3: Preview sweep** — visit `/`, `/teams`, one team detail, `/ev-converter`, `/speed-tiers`, a 404 at desktop width (1280) AND at mobile width (375, confirming the previously-light pages no longer flash light inside the dark shell). Screenshot each for the user.

- [ ] **Step 4: Commit any straggler fixes**

```bash
git add -A src && git commit -m "fix: sweep leftover light-theme classes after Arena re-skin"
```

---

### Task 12: Port Arena Button + StatChip + 6 icons

**Files:**
- Create: `src/design-system/arena/Button.tsx`, `src/design-system/arena/StatChip.tsx`
- Modify: `src/design-system/arena/Icon.tsx`, `src/design-system/arena/index.ts`
- Test: `src/design-system/arena/arena-button.test.tsx`

**Interfaces:**
- Produces: `Button` `{ children?: ReactNode; variant?: 'primary'|'secondary'|'ghost'|'danger'; size?: 'sm'|'md'|'lg'; block?: boolean; disabled?: boolean; icon?: ReactNode; style?: CSSProperties } & ButtonHTMLAttributes<HTMLButtonElement>`; `StatChip` `{ label: string; value: number | string; tone?: 'accent'|'safe'|'danger'|'field'|'muted'; style?: CSSProperties }`; Icon names extended with `'plus' | 'pencil' | 'share' | 'trash-2' | 'users-round' | 'clipboard-paste'`.

- [ ] **Step 1: Write the failing test** (`src/design-system/arena/arena-button.test.tsx`):

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Arena Button', () => {
  it('renders children and fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Create new team</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Create new team' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it('does not fire when disabled', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

Run: `npx vitest run src/design-system/arena/arena-button.test.tsx` → FAIL (Button not found).

- [ ] **Step 2: Port Button.tsx** (faithful to the DS source, typed, matching the local kit's conventions):

```tsx
import React from 'react';

export interface ArenaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  icon?: React.ReactNode;
}

const SIZES = {
  sm: { height: 36, padding: '0 12px', fontSize: 13, radius: 'var(--r-sm)', gap: 6 },
  md: { height: 44, padding: '0 16px', fontSize: 14, radius: 'var(--r-md)', gap: 8 },
  lg: { height: 50, padding: '0 20px', fontSize: 15, radius: 'var(--r-md)', gap: 8 },
} as const;

const VARIANTS = {
  primary: { background: 'var(--accent)', color: 'var(--accent-ink)', border: '1px solid transparent' },
  secondary: { background: 'var(--surface-inset)', color: 'var(--ink-1)', border: '1px solid var(--line-2)' },
  ghost: { background: 'transparent', color: 'var(--ink-2)', border: '1px solid transparent' },
  danger: { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-line)' },
} as const;

export const Button: React.FC<ArenaButtonProps> = ({
  children, variant = 'primary', size = 'md', block = false, disabled = false, icon = null, style, ...rest
}) => {
  const s = SIZES[size];
  return (
    <button
      disabled={disabled}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : 'auto',
        alignItems: 'center', justifyContent: 'center',
        gap: s.gap, height: s.height, padding: s.padding,
        fontFamily: 'var(--font-ui)', fontSize: s.fontSize, fontWeight: 700,
        letterSpacing: '0.005em', lineHeight: 1, borderRadius: s.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'filter var(--dur) var(--ease), transform var(--dur-fast) var(--ease)',
        WebkitTapHighlightColor: 'transparent',
        ...VARIANTS[variant], ...style,
      }}
      onPointerDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
};
```

- [ ] **Step 3: Port StatChip.tsx**:

```tsx
import React from 'react';

const TONES = {
  accent: 'var(--accent-hover)',
  safe: 'var(--safe)',
  danger: 'var(--danger)',
  field: 'var(--field)',
  muted: 'var(--ink-3)',
} as const;

export interface StatChipProps {
  label: string;
  value: number | string;
  tone?: keyof typeof TONES;
  style?: React.CSSProperties;
}

/** Tiny labelled numeric readout for speed tiers (Max+ / Max / Uninvested / Min−). */
export const StatChip: React.FC<StatChipProps> = ({ label, value, tone = 'muted', style }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
    minWidth: 0, flex: 1, padding: '6px 4px',
    background: 'var(--surface-inset)', border: '1px solid var(--line-1)',
    borderRadius: 'var(--r-sm)', ...style,
  }}>
    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 700, letterSpacing: 'var(--ls-wide)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: TONES[tone], letterSpacing: 'var(--ls-tight)', lineHeight: 1.1 }}>{value}</span>
  </div>
);
```

- [ ] **Step 4: Extend Icon.tsx** — add six entries to the existing name→SVG map, in the file's established format (24×24 viewBox, stroke=currentColor outline paths):

- `plus`: `<path d="M5 12h14"/><path d="M12 5v14"/>`
- `pencil`: `<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>`
- `share`: `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>`
- `trash-2`: `<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>`
- `users-round`: `<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>`
- `clipboard-paste`: `<path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M11 14h10"/><path d="m17 10 4 4-4 4"/>`

Update the `IconName` union with the six new names. (Path data is from Lucide; the preview step visually confirms each renders correctly — if one looks wrong, copy the exact path from lucide.dev for that name.)

- [ ] **Step 5: Export from index.ts** — add `Button`, `StatChip` to the barrel.

- [ ] **Step 6: Run tests**

Run: `npm test` → all pass including the two new Button tests.

- [ ] **Step 7: Commit**

```bash
git add src/design-system/arena
git commit -m "feat: port Arena Button + StatChip, extend Icon set (plus/pencil/share/trash-2/users-round/clipboard-paste)"
```

---

### Task 13: Mobile Teams screen

**Files:**
- Create: `src/features/teams/components/mobile/ArenaTeams.tsx`
- Modify: `src/pages/Teams/index.tsx`

**Interfaces:**
- Consumes: arena kit (`Card, Badge, Button, Icon, Sprite, ItemIcon, Sheet`), `TeamWithMembers` from `@/features/teams/hooks/useTeams`.
- Produces: `ArenaTeams` props:

```ts
export interface ArenaTeamsProps {
  teams: TeamWithMembers[];
  loading: boolean;
  error: string | null;
  onCreate: (name: string) => void;          // page's createTeam-and-navigate
  onImport: () => void;                       // opens existing TeamShowdownImportModal
  onScan: () => void;                         // opens existing ScanTeamModal
  onOpen: (id: string) => void;               // navigate to /teams/:id
  onExport: (team: TeamWithMembers) => void;  // opens existing TeamExportModal
  onDelete: (id: string, name: string) => void;
}
```

- [ ] **Step 1: Write ArenaTeams.tsx** (structure mirrors the DS reference `ui_kits/arena-app/Teams.jsx`; inline `var(--token)` styles like the other Arena mobile components):

```tsx
import React, { useState } from 'react';
import { Card, Badge, Button, Icon, Sprite, ItemIcon, Sheet } from '@/design-system/arena';
import type { TeamWithMembers } from '@/features/teams/hooks/useTeams';

export interface ArenaTeamsProps { /* as in Interfaces above */ }

const MemberSprite: React.FC<{ dex: number | null; item: string | null }> = ({ dex, item }) => (
  <div style={{ position: 'relative', width: 44, flex: '0 0 auto' }}>
    <Sprite dex={dex} size={44} />
    <span style={{ position: 'absolute', right: -4, bottom: -4 }}>
      <ItemIcon item={item} size={16} />
    </span>
  </div>
);

const TeamCard: React.FC<{
  team: TeamWithMembers;
  onOpen: () => void; onExport: () => void; onDelete: () => void;
}> = ({ team, onOpen, onExport, onDelete }) => (
  <Card padded={false} style={{ overflow: 'hidden' }}>
    <div style={{ padding: 'var(--sp-4) var(--sp-4) var(--sp-3)' }} onClick={onOpen}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--ink-1)', letterSpacing: 'var(--ls-tight)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>Created {team.createdAt.toLocaleDateString()}</div>
        </div>
        <Badge tone={team.members.length === 6 ? 'accent' : 'neutral'} solid={team.members.length === 6}>{team.members.length} / 6</Badge>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
        {team.members.slice(0, 6).map((m) => (
          <MemberSprite key={m.id} dex={m.configuration.selectedId} item={m.configuration.item} />
        ))}
        {team.members.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>Empty team</span>
        )}
      </div>
    </div>
    <div style={{ display: 'flex', borderTop: '1px solid var(--line-1)' }}>
      {([
        { label: 'Edit', icon: 'pencil', tone: 'var(--ink-2)', onClick: onOpen },
        { label: 'Export', icon: 'share', tone: 'var(--ink-2)', onClick: onExport },
        { label: 'Delete', icon: 'trash-2', tone: 'var(--danger)', onClick: onDelete },
      ] as const).map((a, i) => (
        <button key={a.label} onClick={a.onClick} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          height: 46, background: 'transparent', border: 'none',
          borderLeft: i ? '1px solid var(--line-1)' : 'none', cursor: 'pointer',
          color: a.tone, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700,
        }}>
          <Icon name={a.icon} size={15} color={a.tone} />{a.label}
        </button>
      ))}
    </div>
  </Card>
);

export const ArenaTeams: React.FC<ArenaTeamsProps> = ({
  teams, loading, error, onCreate, onImport, onScan, onOpen, onExport, onDelete,
}) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const submit = () => { if (name.trim()) { onCreate(name.trim()); setName(''); setCreateOpen(false); } };

  if (loading) return <div style={{ padding: 'var(--sp-6) var(--gutter)', color: 'var(--ink-3)', textAlign: 'center' }}>Loading teams…</div>;
  if (error) return <div style={{ padding: 'var(--sp-6) var(--gutter)', color: 'var(--danger)' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 'var(--sp-4) var(--gutter) var(--sp-7)' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <Button variant="primary" block icon={<Icon name="plus" size={18} />} onClick={() => setCreateOpen(true)}>Create new team</Button>
        <Button variant="secondary" icon={<Icon name="clipboard-paste" size={16} />} onClick={onImport}>Import</Button>
        <Button variant="secondary" icon={<Icon name="search" size={16} />} onClick={onScan}>Scan</Button>
      </div>

      {teams.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 6 }}>
          <div style={{ width: 72, height: 72, borderRadius: 'var(--r-lg)', background: 'var(--surface-card)', border: '1px solid var(--line-2)', display: 'grid', placeItems: 'center', marginBottom: 10 }}>
            <Icon name="users-round" size={30} color="var(--accent)" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink-1)' }}>No teams yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.5, maxWidth: 240 }}>
            Build your first team to start running damage calcs and checking speed tiers.
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 240 }}>
            <Button variant="primary" size="lg" block icon={<Icon name="plus" size={18} />} onClick={() => setCreateOpen(true)}>Create new team</Button>
            <Button variant="secondary" block icon={<Icon name="clipboard-paste" size={16} />} onClick={onImport}>Import from Showdown</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} onOpen={() => onOpen(t.id)} onExport={() => onExport(t)} onDelete={() => onDelete(t.id, t.name)} />
          ))}
        </div>
      )}

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Create team">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Team name"
            style={{
              height: 44, padding: '0 12px', borderRadius: 'var(--r-sm)',
              background: 'var(--surface-inset)', border: '1px solid var(--border-input)',
              color: 'var(--ink-1)', fontFamily: 'var(--font-ui)', fontSize: 15, outline: 'none',
            }}
          />
          <Button variant="primary" block disabled={!name.trim()} onClick={submit}>Create</Button>
        </div>
      </Sheet>
    </div>
  );
};
```

- [ ] **Step 2: Wire into the page** — in `src/pages/Teams/index.tsx`, add `import { useIsMobile } from '@/hooks/useIsMobile';` and `import { ArenaTeams } from '@/features/teams/components/mobile/ArenaTeams';`, call `const isMobile = useIsMobile();`, and replace the loading/error early-returns + main desktop block with a branch BEFORE them (modals + toast render for both branches):

```tsx
if (isMobile) {
  return (
    <>
      <ArenaTeams
        teams={teams} loading={teamsLoading} error={error}
        onCreate={async (name) => { const id = await createTeam(name); navigate(`/teams/${id}`); }}
        onImport={() => setIsImportModalOpen(true)}
        onScan={() => setIsScanModalOpen(true)}
        onOpen={(id) => navigate(`/teams/${id}`)}
        onExport={(team) => setExportTeam(team)}
        onDelete={handleDeleteTeam}
      />
      {exportTeam && (
        <TeamExportModal /* identical props to the desktop instance */ />
      )}
      <TeamShowdownImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportTeam} />
      <ScanTeamModal isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} onImport={handleImportTeam} pokemonList={pokemonList} />
      <ToastNotification message={toast} />
    </>
  );
}
```

(Modals stay the shared re-skinned ones — a Sheet-native import flow is a future slice. `// ponytail: shared modals on mobile; replace with Sheets if UX demands`.)

- [ ] **Step 3: Verify + commit**

Run: `npm test` → pass. Preview at 375px: `/teams` — Arena cards with sprite rows, create Sheet, empty state (temporarily filter teams to `[]` in devtools or use a fresh DB — or just verify populated state + Sheet). Desktop unchanged.

```bash
git add src/features/teams/components/mobile src/pages/Teams
git commit -m "feat: Arena mobile Teams screen (cards, actions, create sheet, empty state)"
```

---

### Task 14: Mobile Speed tiers screen

**Files:**
- Create: `src/pages/SpeedTierList/ArenaSpeedTiers.tsx`
- Modify: `src/pages/SpeedTierList/index.tsx` (add `export` to the `PokemonWithSpeeds` interface + the mobile branch)

**Interfaces:**
- Consumes: `Sprite, Icon, Badge, StatChip, Sheet, TypeBadge` from the arena kit; `FullPokemonDetail` from `@/components/organisms/PokemonDetailModal`; `PokemonWithSpeeds` (exported from the page).
- Produces: `ArenaSpeedTiers` props:

```ts
export interface ArenaSpeedTiersProps {
  groups: { baseSpeed: number; pokemon: PokemonWithSpeeds[] }[];
  isLoading: boolean;
  onSelect: (id: number) => void;
  detail: FullPokemonDetail | null;          // page's detailedPokemon
  otherForms: { id: number; name: string }[];
  onCloseDetail: () => void;
  onFormSelect: (id: number) => void;
}
```

- [ ] **Step 1: Write ArenaSpeedTiers.tsx** (reference: `ui_kits/arena-app/SpeedTiers.jsx` — sticky group headers, rows with four StatChips, detail Sheet with stat bars):

```tsx
import React from 'react';
import { Sprite, Icon, Badge, StatChip, Sheet, TypeBadge } from '@/design-system/arena';
import type { FullPokemonDetail } from '@/components/organisms/PokemonDetailModal';
import type { PokemonWithSpeeds } from './index';

export interface ArenaSpeedTiersProps { /* as in Interfaces above */ }

const STATS: { label: string; key: keyof FullPokemonDetail }[] = [
  { label: 'HP', key: 'baseHp' }, { label: 'Atk', key: 'baseAttack' },
  { label: 'Def', key: 'baseDefense' }, { label: 'SpA', key: 'baseSpAtk' },
  { label: 'SpD', key: 'baseSpDef' }, { label: 'Spe', key: 'baseSpeed' },
];

const Detail: React.FC<{ mon: FullPokemonDetail; forms: { id: number; name: string }[]; onFormSelect: (id: number) => void }> = ({ mon, forms, onFormSelect }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <Sprite dex={mon.id} size={64} ring tone="accent" />
      <div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
          {[mon.type1, mon.type2].filter(Boolean).map((t) => <TypeBadge key={t} type={String(t)} />)}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>Base speed {mon.baseSpeed}</div>
      </div>
    </div>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: 10 }}>BASE STATS</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {STATS.map(({ label, key }) => {
        const v = Number(mon[key] ?? 0);
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)' }}>{label}</span>
            <span style={{ width: 32, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', textAlign: 'right' }}>{v}</span>
            <div style={{ flex: 1, height: 8, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (v / 160) * 100)}%`, height: '100%', background: label === 'Spe' ? 'var(--accent)' : 'var(--ink-3)' }} />
            </div>
          </div>
        );
      })}
    </div>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: 10 }}>ALTERNATE FORMS</div>
    {forms.length > 1 ? (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {forms.map((f) => (
          <button key={f.id} onClick={() => onFormSelect(f.id)} style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>{f.name}</button>
        ))}
      </div>
    ) : (
      <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No alternate forms.</div>
    )}
  </div>
);

const Row: React.FC<{ mon: PokemonWithSpeeds; onClick: () => void }> = ({ mon, onClick }) => (
  <button onClick={onClick} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'var(--surface-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', cursor: 'pointer' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <Sprite dex={mon.id} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mon.name}</div>
        {mon.nameZh && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{mon.nameZh}</div>}
      </div>
      <Icon name="chevron-right" size={16} color="var(--ink-3)" />
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <StatChip label="Max+" value={mon.maxPlus} tone="accent" />
      <StatChip label="Max" value={mon.maxNeutral} tone="muted" />
      <StatChip label="Uninvested" value={mon.uninvested} tone="muted" />
      <StatChip label="Min−" value={mon.minMinus} tone="danger" />
    </div>
  </button>
);

export const ArenaSpeedTiers: React.FC<ArenaSpeedTiersProps> = ({ groups, isLoading, onSelect, detail, otherForms, onCloseDetail, onFormSelect }) => {
  if (isLoading) return <div style={{ padding: 'var(--sp-6) var(--gutter)', color: 'var(--ink-3)', textAlign: 'center' }}>Loading speed tiers…</div>;
  return (
    <div style={{ paddingBottom: 'var(--sp-7)' }}>
      {groups.map((g) => (
        <div key={g.baseSpeed}>
          <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '8px var(--gutter)', background: 'var(--navy-850)', borderBottom: '1px solid var(--line-1)' }}>
            <Icon name="gauge" size={14} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', letterSpacing: '0.02em' }}>Base {g.baseSpeed}</span>
            <span style={{ flex: 1 }} />
            <Badge>{g.pokemon.length}</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 'var(--sp-3) var(--gutter)' }}>
            {g.pokemon.map((mon) => <Row key={mon.id} mon={mon} onClick={() => onSelect(mon.id)} />)}
          </div>
        </div>
      ))}
      <Sheet open={!!detail} onClose={onCloseDetail} title={detail?.nameEn ?? ''}>
        {detail && <Detail mon={detail} forms={otherForms} onFormSelect={onFormSelect} />}
      </Sheet>
    </div>
  );
};
```

Note: check `FullPokemonDetail`'s actual stat field names in `PokemonDetailModal.tsx` when implementing; the `STATS` keys above must match them exactly (they mirror the drizzle `pokemon` columns used elsewhere: `baseHp`, `baseAttack`, `baseDefense`, `baseSpAtk`, `baseSpDef`, `baseSpeed`).

- [ ] **Step 2: Wire into the page** — in `src/pages/SpeedTierList/index.tsx`: add `export` to `interface PokemonWithSpeeds`; import `useIsMobile` + `ArenaSpeedTiers`; before the desktop return:

```tsx
if (isMobile) {
  return (
    <ArenaSpeedTiers
      groups={groupedPokemon.map(g => ({ baseSpeed: g.baseSpeed, pokemon: g.pokemon }))}
      isLoading={isLoading}
      onSelect={handleSelectPokemon}
      detail={detailedPokemon}
      otherForms={otherForms}
      onCloseDetail={handleCloseModal}
      onFormSelect={handleSelectPokemon}
    />
  );
}
```

- [ ] **Step 3: Verify + commit**

Run: `npm test` → pass. Preview at 375px: `/speed-tiers` — sticky headers, StatChip rows, tap a row → detail Sheet with stat bars + forms. Desktop unchanged.

```bash
git add src/pages/SpeedTierList
git commit -m "feat: Arena mobile speed tiers (sticky groups, stat chips, detail sheet)"
```

---

### Task 15: Mobile EV/SP converter screen

**Files:**
- Create: `src/pages/EvSpConverter/ArenaEvSp.tsx`
- Modify: `src/pages/EvSpConverter/index.tsx`

**Interfaces:**
- Consumes: `Card, CardHeader, Button` from the arena kit; `EvSpread` from `@/components/organisms/EvSpForm`; `convertEvToSp` from `@/features/pokemon/utils/sp-ev-converter`.
- Produces: `ArenaEvSp` props: `{ spread: EvSpread; onSpreadChange: (s: EvSpread) => void; onReset: () => void; totalEvs: number; totalSp: number }`.

- [ ] **Step 1: Write ArenaEvSp.tsx** (no DS reference screen — extrapolated: one Card, six rows of label / range slider / EV input / SP readout, totals footer, ghost-danger reset, mono formula footnote):

```tsx
import React from 'react';
import { Card, Button } from '@/design-system/arena';
import { convertEvToSp } from '@/features/pokemon/utils/sp-ev-converter';
import type { EvSpread } from '@/components/organisms/EvSpForm';

export interface ArenaEvSpProps {
  spread: EvSpread;
  onSpreadChange: (s: EvSpread) => void;
  onReset: () => void;
  totalEvs: number;
  totalSp: number;
}

const STATS: { key: keyof EvSpread; label: string }[] = [
  { key: 'hp', label: 'HP' }, { key: 'atk', label: 'Atk' }, { key: 'def', label: 'Def' },
  { key: 'spa', label: 'SpA' }, { key: 'spd', label: 'SpD' }, { key: 'spe', label: 'Spe' },
];

export const ArenaEvSp: React.FC<ArenaEvSpProps> = ({ spread, onSpreadChange, onReset, totalEvs, totalSp }) => {
  const set = (key: keyof EvSpread, v: number) =>
    onSpreadChange({ ...spread, [key]: Math.max(0, Math.min(252, Math.round(v / 4) * 4)) });
  const over = totalEvs > 510;

  return (
    <div style={{ padding: 'var(--sp-4) var(--gutter) var(--sp-7)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STATS.map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 32, fontSize: 11, fontWeight: 700, color: key === 'spe' ? 'var(--accent)' : 'var(--ink-3)' }}>{label}</span>
              <input
                type="range" min={0} max={252} step={4} value={spread[key]}
                onChange={(e) => set(key, Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
              <input
                type="number" inputMode="numeric" min={0} max={252} step={4} value={spread[key]}
                onChange={(e) => set(key, Number(e.target.value) || 0)}
                style={{ width: 56, height: 36, textAlign: 'center', borderRadius: 'var(--r-xs)', background: 'var(--surface-inset)', border: '1px solid var(--border-input)', color: spread[key] > 0 ? 'var(--ink-1)' : 'var(--ink-4)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}
              />
              <span style={{ width: 44, textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: spread[key] > 0 ? 'var(--accent)' : 'var(--ink-4)' }}>
                {convertEvToSp(spread[key])} <span style={{ fontSize: 9.5, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)', fontWeight: 700 }}>SP</span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line-1)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: over ? 'var(--danger)' : 'var(--ink-3)' }}>EVS {totalEvs} / 510</div>
            <div style={{ height: 6, marginTop: 4, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (totalEvs / 510) * 100)}%`, height: '100%', background: over ? 'var(--danger)' : 'var(--accent)' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink-1)' }}>
            {totalSp} <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)', fontWeight: 700 }}>SP total</span>
          </div>
        </div>
      </Card>
      <Button variant="danger" block onClick={onReset}>Reset all</Button>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', textAlign: 'center' }}>
        SP = floor((EV + 4) / 8) · max 252 EV per stat · 510 total
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Wire into the page** — import `useIsMobile` + `ArenaEvSp` in `src/pages/EvSpConverter/index.tsx`; before the desktop return:

```tsx
if (isMobile) {
  return (
    <ArenaEvSp
      spread={spread}
      onSpreadChange={handleSpreadChange}
      onReset={handleReset}
      totalEvs={totals.totalEvs}
      totalSp={totals.totalSp}
    />
  );
}
```

(The page's `handleSpreadChange` already enforces the 510 pool cap — the mobile UI reuses it untouched.)

- [ ] **Step 3: Verify + commit**

Run: `npm test` → pass. Preview at 375px: `/ev-converter` — sliders update SP readouts, totals bar, reset works. Desktop unchanged.

```bash
git add src/pages/EvSpConverter
git commit -m "feat: Arena mobile EV/SP converter"
```

---

### Task 16: Mobile Team detail screen

**Files:**
- Create: `src/features/teams/components/mobile/ArenaTeamDetail.tsx`
- Modify: `src/pages/TeamDetail/index.tsx`

**Interfaces:**
- Consumes: `Card, Badge, Button, Icon, Sprite, ItemIcon, TypeBadge, Sheet` from the arena kit; `useTeamDetail`'s returns (already destructured in the page — see `src/pages/TeamDetail/index.tsx:19-36`).
- Produces: `ArenaTeamDetail` props:

```ts
export interface ArenaTeamDetailProps {
  team: NonNullable<ReturnType<typeof useTeamDetail>['team']>;
  pokemonList: { id: number; nameEn: string | null }[]; // same list the page passes to TeamMemberGrid
  onRename: (name: string) => void;        // handleRenameTeam
  onExportTeam: () => void;                 // modals.openModal('export')
  onImportTeam: () => void;                 // modals.openModal('importTeam')
  onAdd: () => void;                        // handleAddPokemonClick
  onImportSingle: () => void;               // modals.openModal('importSingle')
  onEdit: (memberId: string) => void;       // handleEditPokemonClick — match the desktop TeamMemberGrid callback signature exactly when implementing
  onExportMember: (memberId: string) => void; // handleExportIndividual — same note
  onRemove: (memberId: string) => void;     // handleRemovePokemon — same note
}
```

**IMPORTANT:** before coding, read `src/features/teams/components/TeamMemberGrid.tsx` to copy the EXACT argument types of `onEditPokemon` / `onExportIndividual` / `onRemovePokemon` (they may take the member object rather than an id) and mirror them in the props above.

- [ ] **Step 1: Write ArenaTeamDetail.tsx** — structure (extrapolated from the Teams reference patterns):
  - Header `Card`: team name in display font + pencil icon button → opens a rename `Sheet` (input + save Button, same pattern as ArenaTeams' create Sheet); "Created {date}" sub-line; `Badge` `{n} / 6`; a row of two secondary Buttons: Export (`share` icon → `onExportTeam`), Import (`clipboard-paste` icon → `onImportTeam`).
  - One `Card padded={false}` per member: top section (tap → `onEdit`): `Sprite` (size 56) + name + `TypeBadge` row (from member configuration `type1`/`type2`) + `ItemIcon`+item / ability / nature as small `label: value` lines (11px label `--ink-3`, value `--ink-2`); moves as four inset pills (13px, `--surface-inset` bg, `--line-1` border, move name or "—"); footer action bar identical to ArenaTeams' TeamCard (Edit `pencil` / Export `share` / Remove `trash-2` in danger).
  - Below the list: `Button variant="secondary" block icon={plus}` "Add member" (`onAdd`) and `Button variant="ghost" block` "Import from Showdown" (`onImportSingle`) — hide both when the team is full (6 members).
  - Species names resolve via `pokemonList.find(p => p.id === member.configuration.selectedId)?.nameEn ?? 'Unknown'`.

- [ ] **Step 2: Wire into the page** — in `src/pages/TeamDetail/index.tsx`, import `useIsMobile` + `ArenaTeamDetail`. Mobile branch replaces ONLY the header + grid block; all five modals + toast render in both branches (extract the modals JSX into a local `modals` variable or fragment used by both returns to avoid duplication). Loading/error mobile states: plain centered `--ink-3` / `--danger` text like ArenaTeams.

- [ ] **Step 3: Verify + commit**

Run: `npm test` → pass. Preview at 375px: open a team — Arena member cards, rename Sheet, editor modal opens dark (re-skinned in Task 8), add/remove work. Desktop unchanged.

```bash
git add src/features/teams/components/mobile src/pages/TeamDetail
git commit -m "feat: Arena mobile team detail (member cards, rename sheet, editor wiring)"
```

---

### Task 17: Final verification + docs

- [ ] **Step 1: Full suite + typecheck + build**

Run: `npm test` → all pass (245+ tests). Run: `npm run build` → clean.

- [ ] **Step 2: Preview matrix** — all six routes at 1280px AND 375px; screenshot each and share with the user. Check specifically: no light flashes, sticky headers behave inside the mobile scroll container, sheets open above the TabBar, the desktop calculator still computes identical damage numbers.

- [ ] **Step 3: Graph + memory upkeep** — if `graphify-out/graph.json` exists, run `graphify update .`. Update the auto-memory `mobile-redesign-direction.md` "BUILT" note with the whole-site completion status.

- [ ] **Step 4: Commit + wrap up**

```bash
git add -A && git commit -m "docs: arena site redesign verification notes"
```

Then use superpowers:finishing-a-development-branch (PR to `main`).

---

## Self-Review Notes

- **Spec coverage:** Phase-1 spec items 1–5 → Tasks 1–11 (tokens→Tailwind = 1; shell = 2; sweep = 3–10 covering all 6 pages + 6 atoms + 18 molecules + 11 organisms + features UI; reuse-over-restyle = tint TypeBadge in Task 5, Arena Button/StatChip reused across Phase 2; modal styling = Tasks 3/8). Phase-2 spec items 1–4 → Tasks 13–16 (+12 for missing kit pieces). Verification section → Tasks 11 & 17.
- **Known judgment calls encoded above:** terrain color-chain collapses to one amber field tint (DS one-accent rule); nature +/− keeps the red/blue Pokémon convention via danger/accent tints; mobile screens reuse the re-skinned shared modals (Sheet-native flows are future slices).
- **Type-consistency:** Arena component props in Phase 2 match the current `src/design-system/arena` sources (`Sprite dex/size/ring/tone`, `ItemIcon item/size`, `Badge tone/solid`, `Sheet open/onClose/title`); Task 16 explicitly re-checks `TeamMemberGrid` callback signatures before coding.
