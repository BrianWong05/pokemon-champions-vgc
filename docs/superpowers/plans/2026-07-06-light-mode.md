# Light Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light theme that defaults to the OS preference, with a persisted in-app sun/moon toggle in both shells.

**Architecture:** Dark stays the default `:root` token set in `src/design-system/arena/tokens.css`; light mode is a single `:root[data-theme='light']` override block. A ~40-line `theme.ts` module resolves localStorage → `prefers-color-scheme`, and a pre-paint script in `index.html` prevents a dark flash. The identical light tokens are also pushed to the Claude Design project (source of truth).

**Tech Stack:** React 18 + Vite + vitest (jsdom pragma per test file), CSS custom properties, Tailwind 4 `@theme inline` (already maps vars — adapts automatically).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-light-mode-design.md`
- Branch: `feat/light-mode` (already created from main; spec committed).
- Pokémon type colors (`--type-*` and `pokemon-types.ts`) are identical in both themes — do not touch.
- The Sheet scrim (`Sheet.tsx` rgba overlay) stays dark in both themes — do not touch.
- The raw `--navy-*` ramp is NOT overridden in light mode — it doubles as "always dark" constants (e.g. `Badge.tsx` solid-badge text). Components must not use `--navy-*` for theme-dependent surfaces (Task 1 fixes the three existing cases).
- localStorage key is exactly `theme`, values exactly `'light'` / `'dark'`.
- Claude Design project: "Arena VGC Design System", projectId `f20e187b-0c82-44ce-879c-8c25a14c2906`. Task 4 MUST run in the main session (DesignSync auth + permission prompts), never in a subagent.
- Run tests with `npx vitest run <file>`; full type/build check with `npm run build`.

---

### Task 1: Light token block + semantic-surface refactors

**Files:**
- Modify: `src/design-system/arena/tokens.css`
- Modify: `src/index.css` (remove `color-scheme` from `@layer base`)
- Modify: `src/design-system/arena/ItemIcon.tsx:25`
- Modify: `src/features/damage-calculator/components/mobile/ArenaHud.tsx:35`
- Modify: `src/pages/SpeedTierList/ArenaSpeedTiers.tsx:86`

**Interfaces:**
- Produces: CSS attribute contract `html[data-theme='light']` switches the palette; new alias `--surface-sticky` (dark: `var(--navy-850)`, light: `#EAEEF6`). Task 2's `applyTheme()` sets that attribute; Task 5 verifies visually.

- [ ] **Step 1: Add `--surface-sticky` alias and refactor `--ring` in `tokens.css`**

In the `/* --- Semantic aliases --- */` section of `src/design-system/arena/tokens.css`, after `--border-input: var(--line-2);` add:

```css
  --surface-sticky: var(--navy-850); /* opaque sticky chrome (HUD, in-page headers) */
```

In the effects section, change the focus ring (same computed value in dark, auto-adapts in light):

```css
  /* Focus ring */
  --ring: 0 0 0 2px var(--bg-page), 0 0 0 4px var(--accent);
```

- [ ] **Step 2: Add `color-scheme` to tokens and the light override block**

At the top of the first `:root` block in `tokens.css` (line 9, before `--navy-900`), add:

```css
  color-scheme: dark; /* native selects/checkboxes/scrollbars */
```

At the end of `tokens.css`, append:

```css
/* ====================================================================
   Light theme — overrides color/effect tokens only. The raw --navy-*
   ramp is intentionally NOT overridden: it doubles as "always dark"
   constants (e.g. solid Badge text). Aliases that only re-point at
   other vars (--border-card, --text-*) auto-follow and are omitted.
   ==================================================================== */
:root[data-theme='light'] {
  color-scheme: light;

  /* --- Hairline borders --- */
  --line-1: #DFE5F0;
  --line-2: #C9D3E6;
  --line-3: #AAB8D4;

  /* --- Ink (text) --- */
  --ink-1: #1A2130;
  --ink-2: #4D5A72;
  --ink-3: #6C7890;
  --ink-4: #98A2B5;

  /* --- Accent: same electric-indigo family, darkened for white;
         hover/press darken further (inverse of dark theme) --- */
  --accent: #3D67E6;
  --accent-hover: #2F55C7;
  --accent-press: #2545A8;
  --accent-soft: rgba(61,103,230,0.12);
  --accent-soft-line: rgba(61,103,230,0.38);

  /* --- Semantic: darkened to hold AA as text on white --- */
  --safe: #1D9160;
  --safe-soft: rgba(29,145,96,0.13);
  --safe-line: rgba(29,145,96,0.40);

  --danger: #D63A52;
  --danger-soft: rgba(214,58,82,0.12);
  --danger-line: rgba(214,58,82,0.40);

  --field: #B27A10;
  --field-soft: rgba(178,122,16,0.13);
  --field-line: rgba(178,122,16,0.40);

  /* --- Surfaces --- */
  --bg-page: #F3F5FA;
  --bg-appbar: rgba(243,245,250,0.86);
  --surface-card: #FFFFFF;
  --surface-inset: #EEF1F7;
  --surface-hover: #E5EAF3;
  --surface-sticky: #EAEEF6;

  /* --- Elevation: light surfaces need softer, cooler shadows --- */
  --shadow-pop: 0 8px 24px rgba(23,33,52,0.16);
  --shadow-chrome: 0 -6px 20px rgba(23,33,52,0.10);
  --shadow-hud: 0 6px 20px rgba(23,33,52,0.12);
}
```

(`--accent-ink` stays `#FFFFFF`, `--shadow-card` stays `none` — no override needed.)

- [ ] **Step 3: Remove `color-scheme` from `src/index.css`**

In the `@layer base` block, delete the `:root { color-scheme: dark; ... }` wrapper's `color-scheme` line (keep the `body` rule). The base layer becomes:

```css
@layer base {
  body {
    background-color: var(--bg-page);
    color: var(--text-body);
    font-family: var(--font-ui);
  }
}
```

- [ ] **Step 4: Re-point the three theme-dependent `--navy-*` usages**

`src/design-system/arena/ItemIcon.tsx:25` — the icon tile background:

```tsx
        background: 'var(--surface-inset)',
```

`src/features/damage-calculator/components/mobile/ArenaHud.tsx:35`:

```tsx
      background: 'var(--surface-sticky)',
```

`src/pages/SpeedTierList/ArenaSpeedTiers.tsx:86` — in the sticky header's inline style, replace `background: 'var(--navy-850)'` with:

```tsx
background: 'var(--surface-sticky)'
```

Do NOT touch `Badge.tsx` (`var(--navy-900)` there is deliberate always-dark text on solid type colors).

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: tsc + vite build succeed with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/design-system/arena/tokens.css src/index.css src/design-system/arena/ItemIcon.tsx src/features/damage-calculator/components/mobile/ArenaHud.tsx src/pages/SpeedTierList/ArenaSpeedTiers.tsx
git commit -m "feat: light theme token block + semantic sticky-surface alias"
```

---

### Task 2: Theme resolution module + pre-paint script

**Files:**
- Create: `src/design-system/arena/theme.ts`
- Create: `src/design-system/arena/theme.test.ts`
- Modify: `src/design-system/arena/index.ts` (export)
- Modify: `index.html` (pre-paint script)

**Interfaces:**
- Consumes: the `data-theme` attribute contract from Task 1.
- Produces: `type Theme = 'dark' | 'light'`; `resolveTheme(): Theme`; `applyTheme(t: Theme): void`; `setTheme(t: Theme): void` (persists + applies); `useTheme(): [Theme, (t: Theme) => void]`. All exported from `@/design-system/arena`. Task 3's ThemeToggle consumes `useTheme`.

- [ ] **Step 1: Write the failing test**

Create `src/design-system/arena/theme.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveTheme, setTheme } from './theme';

function stubMatchMedia(prefersLight: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: prefersLight,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('follows the OS preference when nothing is stored', () => {
    stubMatchMedia(true);
    expect(resolveTheme()).toBe('light');
    stubMatchMedia(false);
    expect(resolveTheme()).toBe('dark');
  });

  it('stored override beats the OS preference', () => {
    stubMatchMedia(true);
    localStorage.setItem('theme', 'dark');
    expect(resolveTheme()).toBe('dark');
  });

  it('ignores garbage stored values', () => {
    stubMatchMedia(false);
    localStorage.setItem('theme', 'blurple');
    expect(resolveTheme()).toBe('dark');
  });

  it('setTheme applies the attribute and persists', () => {
    stubMatchMedia(false);
    setTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/arena/theme.test.ts`
Expected: FAIL — cannot resolve `./theme`.

- [ ] **Step 3: Write `theme.ts`**

Create `src/design-system/arena/theme.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'theme';
const query = () => window.matchMedia('(prefers-color-scheme: light)');

/** localStorage override if set, else the OS preference. */
export function resolveTheme(): Theme {
  const stored = localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return query().matches ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

/** Resolved theme + setter. Follows live OS changes until the user overrides. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setState] = useState<Theme>(resolveTheme);
  useEffect(() => {
    const mql = query();
    const onChange = () => {
      if (localStorage.getItem(KEY)) return; // user override wins
      const next = resolveTheme();
      applyTheme(next);
      setState(next);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  const set = useCallback((t: Theme) => { setTheme(t); setState(t); }, []);
  return [theme, set];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/design-system/arena/theme.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Export from the design system barrel**

In `src/design-system/arena/index.ts` add:

```ts
export { resolveTheme, applyTheme, setTheme, useTheme } from './theme';
export type { Theme } from './theme';
```

- [ ] **Step 6: Pre-paint script in `index.html`**

In `index.html`, insert as the first element inside `<body>` (before `<div id="root">`):

```html
    <script>
      var t = localStorage.getItem('theme');
      if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.dataset.theme = t;
    </script>
```

(Must be a blocking inline script — not `type="module"` — so it runs before first paint. Logic must mirror `resolveTheme()` exactly.)

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 8: Commit**

```bash
git add src/design-system/arena/theme.ts src/design-system/arena/theme.test.ts src/design-system/arena/index.ts index.html
git commit -m "feat: theme resolution module + pre-paint script"
```

---

### Task 3: Sun/moon icons + ThemeToggle in both shells

**Files:**
- Modify: `src/design-system/arena/Icon.tsx` (two glyphs)
- Create: `src/design-system/arena/ThemeToggle.tsx`
- Create: `src/design-system/arena/theme-toggle.test.tsx`
- Modify: `src/design-system/arena/index.ts` (export)
- Modify: `src/components/templates/ArenaShell.tsx:44` (mobile AppBar right slot)
- Modify: `src/components/templates/Layout.tsx` (desktop nav)

**Interfaces:**
- Consumes: `useTheme` from Task 2; `Icon` component.
- Produces: `ThemeToggle({ style? })` exported from `@/design-system/arena`; `IconName` gains `'sun' | 'moon'`.

- [ ] **Step 1: Add sun/moon glyphs to `Icon.tsx`**

Extend the `IconName` union (line 3-7):

```ts
export type IconName =
  | 'chevron-right' | 'chevron-down' | 'chevron-up'
  | 'calculator' | 'users' | 'sliders-horizontal' | 'gauge'
  | 'cloud-sun' | 'x' | 'zap' | 'search'
  | 'plus' | 'pencil' | 'share' | 'trash-2' | 'users-round' | 'clipboard-paste'
  | 'sun' | 'moon';
```

Add to `PATHS` (before the closing `};` at line 110), Lucide 24×24 outline style like the neighbors:

```tsx
  'sun': (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  'moon': <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
```

- [ ] **Step 2: Write the failing ThemeToggle test**

Create `src/design-system/arena/theme-toggle.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false, // OS prefers dark
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it('offers the opposite theme and applies it on click', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    // label flips to offer dark again
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/design-system/arena/theme-toggle.test.tsx`
Expected: FAIL — cannot resolve `./ThemeToggle`.

- [ ] **Step 4: Write `ThemeToggle.tsx`**

Create `src/design-system/arena/ThemeToggle.tsx`:

```tsx
import React from 'react';
import { Icon } from './Icon';
import { useTheme } from './theme';

/** ThemeToggle — round icon button showing the theme you'll switch to. */
export function ThemeToggle({ style = {} }: { style?: React.CSSProperties }) {
  const [theme, setTheme] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      aria-label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 'var(--r-pill)',
        background: 'transparent',
        border: '1px solid var(--line-2)',
        color: 'var(--ink-2)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <Icon name={next === 'light' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/design-system/arena/theme-toggle.test.tsx`
Expected: PASS.

- [ ] **Step 6: Export and wire into both shells**

`src/design-system/arena/index.ts`:

```ts
export { ThemeToggle } from './ThemeToggle';
```

`src/components/templates/ArenaShell.tsx` — add `ThemeToggle` to the arena import on line 3, then change the AppBar line (44):

```tsx
      <AppBar
        title={TITLE_BY_TAB[active]}
        right={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle />
            <RegPill value={format} onClick={() => setRegOpen(true)} />
          </div>
        }
      />
```

`src/components/templates/Layout.tsx` — add to the existing import from `@/design-system/arena` (add one if none exists: `import { ThemeToggle } from '@/design-system/arena';`), then in the desktop nav, after the Regulation `</label>`:

```tsx
            <ThemeToggle style={{ marginLeft: 8 }} />
```

- [ ] **Step 7: Run full test suite + build**

Run: `npx vitest run && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/design-system/arena/Icon.tsx src/design-system/arena/ThemeToggle.tsx src/design-system/arena/theme-toggle.test.tsx src/design-system/arena/index.ts src/components/templates/ArenaShell.tsx src/components/templates/Layout.tsx
git commit -m "feat: theme toggle in desktop nav and mobile app bar"
```

---

### Task 4: Push light theme to Claude Design (MAIN SESSION ONLY)

**Files:**
- Remote (project `f20e187b-0c82-44ce-879c-8c25a14c2906`): modify `tokens/colors.css`, `tokens/effects.css`, `components/core/Icon.jsx`; create `guidelines/colors-light.card.html`.

**Interfaces:**
- Consumes: the exact light values from Task 1 and glyphs from Task 3 — remote must end up byte-equivalent in values to local.

**Do not dispatch this task to a subagent — DesignSync needs the main session's auth, and writes require an interactive permission prompt.**

- [ ] **Step 1: Read remote files to modify**

`DesignSync get_file` for `tokens/colors.css`, `tokens/effects.css`, `components/core/Icon.jsx`, and `guidelines/colors-surfaces.card.html` (template for the new card — copy its `<!-- @dsCard group="…" -->` first-line marker format and page structure).

- [ ] **Step 2: Build updated files in the scratchpad**

In the session scratchpad directory, create the four files:
- `colors.css`: remote content + the exact `:root[data-theme='light']` color block from Task 1 Step 2 (borders/ink/accent/semantic/surfaces sections + `--surface-sticky` alias added to the dark `:root` too).
- `effects.css`: remote content + `--ring` refactor + a `:root[data-theme='light']` block with the three shadow overrides and `color-scheme: light` (add `color-scheme: dark` to its `:root`).
- `Icon.jsx`: remote content + the same sun/moon paths as local `Icon.tsx`.
- `colors-light.card.html`: modeled on `colors-surfaces.card.html`, titled "Colors — light surfaces", `@dsCard group="Colors"`, showing the light surface ramp (`#F3F5FA`, `#FFFFFF`, `#EEF1F7`, `#E5EAF3`, `#EAEEF6`), line + ink swatches, and the light accent/semantic values with hex labels.

- [ ] **Step 3: Finalize plan and write**

`DesignSync finalize_plan` with `localDir` = scratchpad dir, writes: `tokens/colors.css`, `tokens/effects.css`, `components/core/Icon.jsx`, `guidelines/colors-light.card.html`. Then `write_files` with the returned planId using `localPath` for each.

- [ ] **Step 4: Verify**

`DesignSync get_file tokens/colors.css` — confirm the light block is present and values match local `tokens.css` exactly.

---

### Task 5: Visual verification (both themes, both viewports)

**Files:** none (verification only; fix regressions in the files above if found).

- [ ] **Step 1: Start the dev server** (`preview_start`).

- [ ] **Step 2: Desktop dark → light**

`preview_resize` desktop. Snapshot/screenshot dark. Click the nav ThemeToggle (`preview_click` on `button[aria-label="Switch to light theme"]`). Verify via `preview_inspect`: `body` background-color computes to `rgb(243, 245, 250)` and primary text is dark. Screenshot light.

- [ ] **Step 3: Reload persistence check**

`preview_eval window.location.reload()` — page must come back light with no dark flash (attribute set pre-paint; verify `document.documentElement.dataset.theme === 'light'` immediately after reload).

- [ ] **Step 4: Mobile shell**

`preview_resize` mobile. Verify the AppBar toggle next to the RegPill; flip themes; check the calculator HUD (`--surface-sticky`), TabBar, Sheet, KO verdict tiles (safe/danger/field soft surfaces) in light mode. Screenshot both themes.

- [ ] **Step 5: OS-preference default check**

`preview_eval`: `localStorage.removeItem('theme'); location.reload()` with `preview_resize` colorScheme `light` emulation — app must render light without a stored key. Then emulate `dark` — renders dark.

- [ ] **Step 6: Share screenshots with the user, note any contrast issues found and fixed.**

- [ ] **Step 7: Commit any fixes**

```bash
git add -u
git commit -m "fix: light theme contrast/polish from visual verification"
```

(Skip if no fixes were needed.)
