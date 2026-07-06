# Arena Mobile Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Arena VGC Design System's Damage Calculator + shared mobile shell into the React app, shown at mobile viewport width, with desktop left pixel-identical.

**Architecture:** A `useIsMobile()` breakpoint hook drives two branches. `Layout` renders the existing desktop header **or** a new dark `ArenaShell` (sticky `AppBar` + scroll region + sticky `TabBar`). `DamageCalculatorPage` keeps all data-loading/state/results/persistence and branches only its render: the existing `DamageCalculatorTemplate` (desktop) or the new `ArenaCalculator` (mobile). Both consume the same `useCalculatorState` state, `useDamageCalc` results, and `dispatch` — the reducer and calc logic are never touched, so there is no behavioral-regression surface.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (the Arena components are inline-styled reading CSS custom-property tokens — they coexist with Tailwind, they do not use it), Vite, Vitest. Design-system source: Claude Design project `Arena VGC Design System` (`f20e187b-0c82-44ce-879c-8c25a14c2906`), pulled with the `DesignSync` tool (`get_file`) after `/design-login`.

## Global Constraints

- **Source of truth = the Arena VGC Design System.** Port faithfully; do not invent tokens, spacing, or a new visual language. Component source is pulled from project `f20e187b-0c82-44ce-879c-8c25a14c2906` via `DesignSync get_file`.
- **Trigger = viewport width.** Arena UI shows at `max-width: 767px` (below Tailwind `md`); wider = the current desktop layout, unchanged.
- **Desktop must stay pixel-identical.** Do not edit desktop render paths; only guard them behind the `useIsMobile()` branch.
- **Do not modify** `useCalculatorState` (reducer/actions/state), `useDamageCalc`, `damage-calc.ts`, or the SP stat model. Mobile is presentation-only over the existing state.
- **Voice:** sentence case everywhere; the DS forbids ALL CAPS except 11px micro-labels. Terse, factual. Numbers are the loudest element.
- **Offline/Capacitor:** no CDN runtime deps. Self-host the three fonts via `@fontsource`. Replace the DS Lucide-CDN `Icon` with a local inline-SVG set. Repoint DS `Sprite`/`ItemIcon` onto the app's existing `PokemonImage`/`ItemImage` atoms.
- **Tokens verbatim:** page `#0B0E14`, card `#151A23`, inset `#1F2636`, hairline `#232B3A`; accent `#4F7DFF`; safe `#36C281` / danger `#F2566B` / field `#F2B53C`; 18 type colors; 4px spacing scale; radii 12/16px; 44/56/64 tap/appbar/tabbar.
- **Testing convention (project):** vitest `include` is `src/**/*.test.ts` only — **no component-render tests**. Pure-logic modules get real vitest tests; component/visual tasks gate on `npm run type-check` + `npm run build` + manual mobile verification.
- **Commits:** frequent, one per task minimum. Branch: `feat/arena-mobile-calculator` off `main`.

---

## File Structure

**Create**
- `src/design-system/arena/tokens.css` — the four DS token `:root` blocks (colors, typography, spacing, effects), verbatim minus the Google-fonts `@import`.
- `src/design-system/arena/Icon.tsx` — local inline-SVG icon set (replaces Lucide).
- `src/design-system/arena/{Card,Badge,Chip,TypeBadge,Sprite,ItemIcon,StatField,KOVerdict,AppBar,RegPill,TabBar,SelectRow,Toggle,Sheet}.tsx` — ported DS components.
- `src/design-system/arena/index.ts` — barrel export.
- `src/design-system/arena/koVerdict.ts` — pure KO-verdict → `{verdict, confidence, tone}` mapping.
- `src/hooks/useIsMobile.ts` — `matchMedia('(max-width: 767px)')` hook.
- `src/components/templates/ArenaShell.tsx` — mobile shell (AppBar + scroll + TabBar + Sheet mount + format Sheet).
- `src/features/damage-calculator/components/mobile/ArenaCalculator.tsx` — mobile calculator composition.
- `src/features/damage-calculator/components/mobile/ArenaHud.tsx` — single-direction result HUD.
- `src/features/damage-calculator/components/mobile/ArenaMonCard.tsx` — attacker/defender card.
- `src/features/damage-calculator/components/mobile/ArenaFieldConditions.tsx` — field chips + gravity.
- `src/features/damage-calculator/components/mobile/ArenaAdvancedSheet.tsx` — per-mon overflow controls.
- `src/features/damage-calculator/components/mobile/ArenaMovePickerSheet.tsx` — 4-move list with per-move damage.
- Test files: `src/hooks/useIsMobile.test.ts`, `src/design-system/arena/koVerdict.test.ts`.

**Modify**
- `src/index.css` — import Arena tokens.
- `src/main.tsx` — import self-hosted `@fontsource` faces.
- `src/components/templates/Layout.tsx` — branch on `useIsMobile()`.
- `src/pages/DamageCalculator/index.tsx` — branch render (desktop template vs `ArenaCalculator`).
- `package.json` — add `@fontsource/space-grotesk`, `@fontsource/manrope`, `@fontsource/jetbrains-mono`.

---

## Task 1: Breakpoint hook `useIsMobile`

**Files:**
- Create: `src/hooks/useIsMobile.ts`
- Test: `src/hooks/useIsMobile.test.ts`

**Interfaces:**
- Produces: `export function useIsMobile(): boolean` — `true` when viewport ≤ 767px. SSR/no-`matchMedia` safe (returns `false`).

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useIsMobile.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIsMobile } from './useIsMobile';

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches,
    media: '(max-width: 767px)',
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    dispatch: (m: boolean) => listeners.forEach((cb) => cb({ matches: m } as MediaQueryListEvent)),
  };
  // @ts-expect-error test shim
  window.matchMedia = () => mql;
  return mql;
}

describe('useIsMobile', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns true when the query matches', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when the query does not match', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('updates when the media query changes', () => {
    const mql = mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => mql.dispatch(true));
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useIsMobile.test.ts`
Expected: FAIL — cannot find module `./useIsMobile`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/hooks/useIsMobile.ts
import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useIsMobile.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useIsMobile.ts src/hooks/useIsMobile.test.ts
git commit -m "feat: add useIsMobile breakpoint hook for Arena mobile UI"
```

---

## Task 2: Design tokens + self-hosted fonts

**Files:**
- Create: `src/design-system/arena/tokens.css`
- Modify: `src/index.css`, `src/main.tsx`, `package.json`

**Interfaces:**
- Produces: CSS custom properties on `:root` — `--navy-900`, `--surface-card`, `--surface-inset`, `--border-card`, `--accent`, `--accent-soft`, `--accent-soft-line`, `--accent-hover`, `--safe/-soft/-line`, `--danger/-soft/-line`, `--field/-soft/-line`, `--ink-1..4`, `--text-strong/-body/-muted`, `--line-1..3`, `--type-*` (18), `--font-display/-ui/-mono`, `--fs-*`, `--fw-*`, `--ls-*`, `--lh-*`, `--sp-1..8`, `--gutter`, `--tap-min`, `--appbar-h`, `--tabbar-h`, `--r-*`, `--shadow-*`, `--dur`, `--ease`. Consumed by every Arena component.

- [ ] **Step 1: Install fonts**

Run:
```bash
npm install --legacy-peer-deps @fontsource/space-grotesk @fontsource/manrope @fontsource/jetbrains-mono
```
Expected: three packages added to `dependencies`.

- [ ] **Step 2: Create `tokens.css`**

Pull the four token files from the DS and concatenate their `:root` blocks verbatim into `src/design-system/arena/tokens.css`. Pull commands:
```
DesignSync get_file  project f20e187b-0c82-44ce-879c-8c25a14c2906  path tokens/colors.css
DesignSync get_file  project f20e187b-0c82-44ce-879c-8c25a14c2906  path tokens/typography.css
DesignSync get_file  project f20e187b-0c82-44ce-879c-8c25a14c2906  path tokens/spacing.css
DesignSync get_file  project f20e187b-0c82-44ce-879c-8c25a14c2906  path tokens/effects.css
```
Concatenate all four `:root { … }` blocks into one file. **Omit** `tokens/fonts.css` (that is the Google-fonts CDN `@import` — fonts come from `@fontsource` in Step 3). The font-family tokens already name `'Space Grotesk'`, `'Manrope'`, `'JetBrains Mono'`, which match the `@fontsource` (non-variable) family names — leave them as-is. Head of the file:

```css
/* Arena VGC Design System — tokens (ported verbatim from the Claude Design project).
   Fonts self-hosted via @fontsource (see main.tsx); this file has no @import. */
:root {
  /* colors.css :root block … */
  /* typography.css :root block … */
  /* spacing.css :root block … */
  /* effects.css :root block … */
}
```

- [ ] **Step 3: Import fonts in `main.tsx`**

Add near the top of `src/main.tsx` (weights the DS uses: Space Grotesk 400/500/600/700, Manrope 400/500/600/700/800, JetBrains Mono 400/500/700):

```ts
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
```

- [ ] **Step 4: Import tokens in `index.css`**

Add to `src/index.css` immediately after `@import "tailwindcss";`:

```css
@import "./design-system/arena/tokens.css";
```

- [ ] **Step 5: Verify build**

Run: `npm run type-check && npm run build`
Expected: builds clean; the three font families are bundled (no network fetch).

- [ ] **Step 6: Commit**

```bash
git add src/design-system/arena/tokens.css src/index.css src/main.tsx package.json package-lock.json
git commit -m "feat: vendor Arena design tokens and self-hosted fonts"
```

---

## Task 3: Local `Icon` (inline SVG, replaces Lucide)

**Files:**
- Create: `src/design-system/arena/Icon.tsx`

**Interfaces:**
- Produces: `export function Icon(props: { name: IconName; size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }): JSX.Element` where `export type IconName = 'chevron-right' | 'chevron-down' | 'chevron-up' | 'calculator' | 'users' | 'sliders-horizontal' | 'gauge' | 'cloud-sun' | 'x' | 'zap'`. Renders an outline `<svg>` (stroke `currentColor` unless `color` given), matching Lucide's 24×24 viewBox + 1.75 default stroke.

- [ ] **Step 1: Implement** (each glyph is a Lucide outline path; these ten cover the shell + calculator)

```tsx
// src/design-system/arena/Icon.tsx
import React from 'react';

export type IconName =
  | 'chevron-right' | 'chevron-down' | 'chevron-up'
  | 'calculator' | 'users' | 'sliders-horizontal' | 'gauge'
  | 'cloud-sun' | 'x' | 'zap';

const PATHS: Record<IconName, React.ReactNode> = {
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-up': <path d="m18 15-6-6-6 6" />,
  'calculator': (<><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="8" y2="10" /><line x1="12" y1="10" x2="12" y2="10" /><line x1="16" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="8" y2="14" /><line x1="12" y1="14" x2="12" y2="14" /><line x1="16" y1="14" x2="16" y2="18" /><line x1="8" y1="18" x2="12" y2="18" /></>),
  'users': (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  'sliders-horizontal': (<><line x1="21" y1="4" x2="14" y2="4" /><line x1="10" y1="4" x2="3" y2="4" /><line x1="21" y1="12" x2="12" y2="12" /><line x1="8" y1="12" x2="3" y2="12" /><line x1="21" y1="20" x2="16" y2="20" /><line x1="12" y1="20" x2="3" y2="20" /><line x1="14" y1="2" x2="14" y2="6" /><line x1="8" y1="10" x2="8" y2="14" /><line x1="16" y1="18" x2="16" y2="22" /></>),
  'gauge': (<><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></>),
  'cloud-sun': (<><path d="M12 2v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="M20 12h2" /><path d="m19.07 4.93-1.41 1.41" /><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" /><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" /></>),
  'x': (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
  'zap': <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />,
};

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75, style = {} }: {
  name: IconName; size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', flex: '0 0 auto', ...style }} aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/design-system/arena/Icon.tsx
git commit -m "feat: local inline-SVG Icon set for Arena (replaces Lucide CDN)"
```

---

## Task 4: Port pure token-styled DS components

Port these DS components to typed `.tsx` in `src/design-system/arena/`. **They already read tokens via `var(--…)` and use inline styles only** — the port is mechanical.

**Port recipe (apply to each):**
1. `DesignSync get_file` the source from project `f20e187b-0c82-44ce-879c-8c25a14c2906`.
2. Keep the inline-style JSX exactly; replace the untyped signature with the typed one below.
3. Replace `import { Icon } from '../core/Icon.jsx'` with `import { Icon } from './Icon'`.
4. `import React from 'react'` stays. File name = component name `.tsx`.

**Files + typed signatures (Produces):**
- `Card.tsx` (source `components/core/Card.jsx`): `export function Card(p: { children: React.ReactNode; inset?: boolean; padded?: boolean; style?: React.CSSProperties } & React.HTMLAttributes<HTMLDivElement>): JSX.Element` and `export function CardHeader(p: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; icon?: React.ReactNode; style?: React.CSSProperties }): JSX.Element`.
- `Badge.tsx` (`components/core/Badge.jsx`): `export function Badge(p: { children: React.ReactNode; tone?: 'neutral'|'accent'|'safe'|'danger'|'field'; solid?: boolean; style?: React.CSSProperties }): JSX.Element`.
- `Chip.tsx` (`components/core/Chip.jsx`): `export function Chip(p: { children: React.ReactNode; active?: boolean; tone?: 'accent'|'safe'|'danger'|'field'; icon?: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }): JSX.Element` and `export function ChipGroup(p: { label?: React.ReactNode; children: React.ReactNode; wrap?: boolean; style?: React.CSSProperties }): JSX.Element`.
- `TypeBadge.tsx` (`components/pokemon/TypeBadge.jsx`): `export function TypeBadge(p: { type: string; size?: 'sm'|'md'; style?: React.CSSProperties }): JSX.Element`. (Keeps `color-mix` — supported in the Capacitor WebView / modern browsers.)
- `StatField.tsx` (`components/pokemon/StatField.jsx`): `export function StatField(p: { label: string; value: number | string; max?: number; active?: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; style?: React.CSSProperties }): JSX.Element` and `export function StatGrid(p: { children: React.ReactNode; style?: React.CSSProperties }): JSX.Element`.
- `KOVerdict.tsx` (`components/pokemon/KOVerdict.jsx`): `export function KOVerdict(p: { verdict?: string; confidence?: string | null; tone?: 'safe'|'danger'|'field'; style?: React.CSSProperties }): JSX.Element`.
- `SelectRow.tsx` (`components/forms/SelectRow.jsx`): `export function SelectRow(p: { label: string; value: React.ReactNode; leading?: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }): JSX.Element`.
- `Toggle.tsx` (`components/forms/Toggle.jsx`): `export function Toggle(p: { on?: boolean; onChange?: (on: boolean) => void; label?: React.ReactNode; style?: React.CSSProperties }): JSX.Element`.
- `Badge`/`Chip`/`KOVerdict` internal `TONES` maps stay as-is.

- [ ] **Step 1: Port all eight files** per the recipe. (No behavior change; inline styles verbatim, types added, Icon import repointed.)

- [ ] **Step 2: Verify**

Run: `npm run type-check`
Expected: clean (no untyped-prop or missing-import errors).

- [ ] **Step 3: Commit**

```bash
git add src/design-system/arena/Card.tsx src/design-system/arena/Badge.tsx src/design-system/arena/Chip.tsx src/design-system/arena/TypeBadge.tsx src/design-system/arena/StatField.tsx src/design-system/arena/KOVerdict.tsx src/design-system/arena/SelectRow.tsx src/design-system/arena/Toggle.tsx
git commit -m "feat: port Arena core/pokemon/forms components to typed tsx"
```

---

## Task 5: Port `Sprite` and `ItemIcon` onto the app's existing atoms

The DS `Sprite`/`ItemIcon` fetch from the PokéAPI CDN. Repoint them onto the app's local atoms (`PokemonImage` by dex id with a local thumbnail + PokéAPI fallback; `ItemImage` by item name), keeping the DS tile/ring/frame chrome and API shape.

**Files:**
- Create: `src/design-system/arena/Sprite.tsx`, `src/design-system/arena/ItemIcon.tsx`

**Interfaces:**
- Consumes: `PokemonImage` (`{ id: number; name: string; className?: string }`, `src/components/atoms/PokemonImage.tsx`), `ItemImage` (`{ name: string; className?: string }`, `src/components/atoms/ItemImage.tsx`).
- Produces: `export function Sprite(p: { dex: number | null; name?: string; size?: number; ring?: boolean; tone?: 'neutral'|'accent'|'safe'|'danger'; style?: React.CSSProperties }): JSX.Element` and `export function ItemIcon(p: { item: string | null; size?: number; framed?: boolean; style?: React.CSSProperties }): JSX.Element`.

- [ ] **Step 1: Implement `Sprite.tsx`** (DS tile chrome, app sprite source)

```tsx
// src/design-system/arena/Sprite.tsx
import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';

const RING: Record<string, string> = {
  neutral: 'var(--line-2)', accent: 'var(--accent-soft-line)',
  safe: 'var(--safe-line)', danger: 'var(--danger-line)',
};

export function Sprite({ dex, name = '', size = 56, ring = false, tone = 'neutral', style = {} }: {
  dex: number | null; name?: string; size?: number; ring?: boolean;
  tone?: 'neutral' | 'accent' | 'safe' | 'danger'; style?: React.CSSProperties;
}) {
  const inner = Math.round(size * 0.92);
  return (
    <div style={{
      width: size, height: size, flex: '0 0 auto', display: 'grid', placeItems: 'center',
      background: 'var(--surface-inset)', borderRadius: 'var(--r-md)',
      border: `1px solid ${ring ? (RING[tone] || RING.neutral) : 'var(--line-1)'}`,
      overflow: 'hidden', ...style,
    }}>
      {dex != null && (
        <PokemonImage id={dex} name={name} className={`object-contain`} />
      )}
    </div>
  );
}
```
(Note: `PokemonImage` sizes via `className`; pass `w-[Npx] h-[Npx]` computed from `inner` if exact sizing is needed — e.g. `className={`object-contain`} style handled by the wrapper's `placeItems:center`. Keep default; the tile clips.)

- [ ] **Step 2: Implement `ItemIcon.tsx`** (DS frame, app item source, by item **name**)

```tsx
// src/design-system/arena/ItemIcon.tsx
import React from 'react';
import ItemImage from '@/components/atoms/ItemImage';

export function ItemIcon({ item, size = 22, framed = true, style = {} }: {
  item: string | null; size?: number; framed?: boolean; style?: React.CSSProperties;
}) {
  const hasItem = !!item && item !== 'None';
  const img = hasItem
    ? <ItemImage name={item as string} className="object-contain" />
    : <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.5, fontWeight: 700, color: 'var(--ink-3)' }}>?</span>;
  if (!framed) return <span style={{ display: 'inline-flex', width: size, height: size, ...style }}>{img}</span>;
  return (
    <span style={{
      display: 'inline-grid', placeItems: 'center', width: size + 8, height: size + 8,
      background: 'var(--navy-900)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-pill)',
      overflow: 'hidden', ...style,
    }}>{img}</span>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run type-check`
Expected: clean. Confirm `src/components/atoms/ItemImage.tsx` exports a default component taking `{ name, className }` (it does — used in `PokemonConfigForm/TopSection.tsx`).

- [ ] **Step 4: Commit**

```bash
git add src/design-system/arena/Sprite.tsx src/design-system/arena/ItemIcon.tsx
git commit -m "feat: Arena Sprite/ItemIcon repointed onto local PokemonImage/ItemImage"
```

---

## Task 6: Port chrome components (`AppBar`, `RegPill`, `TabBar`) + barrel

`AppBar`/`RegPill`/`TabBar` port mechanically (recipe from Task 4), except `TabBar` navigation wires to routes at the call site (Task 8), not inside the component. `Icon` names used are all in Task 3's `IconName`.

**Files:**
- Create: `src/design-system/arena/AppBar.tsx`, `RegPill.tsx`, `TabBar.tsx`, `index.ts`

**Interfaces:**
- Produces:
  - `export function AppBar(p: { title: React.ReactNode; reg?: string; onReg?: () => void; right?: React.ReactNode; sticky?: boolean; style?: React.CSSProperties }): JSX.Element` (source `components/navigation/AppBar.jsx`).
  - `export function RegPill(p: { value?: string; onClick?: () => void; style?: React.CSSProperties }): JSX.Element` (source `components/navigation/RegPill.jsx`).
  - `export const ARENA_TABS: { id: string; label: string; icon: IconName }[]` and `export function TabBar(p: { active?: string; onChange?: (id: string) => void; tabs?: typeof ARENA_TABS; style?: React.CSSProperties }): JSX.Element` (source `components/navigation/TabBar.jsx`).
- Note: `ARENA_TABS` label for the third tab is `'EV/SP'` (matches the current app nav wording); ids `calc|teams|sp|speed`.

- [ ] **Step 1: Port the three files** per the recipe (`Icon` import → `./Icon`). Keep `AppBar` sticky/blur styles verbatim; keep `TabBar` `env(safe-area-inset-bottom)` padding.

- [ ] **Step 2: Create the barrel `index.ts`**

```ts
// src/design-system/arena/index.ts
export { Card, CardHeader } from './Card';
export { Badge } from './Badge';
export { Chip, ChipGroup } from './Chip';
export { TypeBadge } from './TypeBadge';
export { Sprite } from './Sprite';
export { ItemIcon } from './ItemIcon';
export { StatField, StatGrid } from './StatField';
export { KOVerdict } from './KOVerdict';
export { SelectRow } from './SelectRow';
export { Toggle } from './Toggle';
export { Sheet } from './Sheet';
export { AppBar } from './AppBar';
export { RegPill } from './RegPill';
export { TabBar, ARENA_TABS } from './TabBar';
export { Icon } from './Icon';
export type { IconName } from './Icon';
export { koVerdictFromText } from './koVerdict';
export type { KoTone, KoVerdictResult } from './koVerdict';
```
(`Sheet` and `koVerdict` are added in Tasks 7 and 9; the barrel references them ahead — acceptable since the whole barrel compiles once those files exist. If executing strictly in order, add those two export lines in their own tasks.)

- [ ] **Step 3: Verify + Commit**

Run: `npm run type-check` (expected clean once Sheet/koVerdict exist; if running Task 6 before 7/9, temporarily omit those two barrel lines).
```bash
git add src/design-system/arena/AppBar.tsx src/design-system/arena/RegPill.tsx src/design-system/arena/TabBar.tsx src/design-system/arena/index.ts
git commit -m "feat: port Arena AppBar/RegPill/TabBar + barrel export"
```

---

## Task 7: Port `Sheet`

**Files:**
- Create: `src/design-system/arena/Sheet.tsx`

**Interfaces:**
- Produces: `export function Sheet(p: { open: boolean; onClose: () => void; title?: React.ReactNode; children?: React.ReactNode; maxHeight?: string }): JSX.Element` (source `components/feedback/Sheet.jsx`). Absolute-positioned bottom sheet over a scrim; slides via `transform`. Renders inside the shell's relatively-positioned frame.

- [ ] **Step 1: Port** `components/feedback/Sheet.jsx` → `Sheet.tsx` per the recipe (no Icon dep). Add a close affordance on the grab-handle row: an `Icon name="x"` button top-right calling `onClose` (≥44px hit area).

- [ ] **Step 2: Verify + Commit**

Run: `npm run type-check`
```bash
git add src/design-system/arena/Sheet.tsx
git commit -m "feat: port Arena Sheet bottom-sheet component"
```

---

## Task 8: Arena shell + `Layout` branch + format Sheet

**Files:**
- Create: `src/components/templates/ArenaShell.tsx`
- Modify: `src/components/templates/Layout.tsx`

**Interfaces:**
- Consumes: `useIsMobile` (Task 1); `AppBar`, `TabBar`, `ARENA_TABS`, `RegPill`, `Sheet`, `Chip`, `ChipGroup` (barrel); `useFormat()` → `{ format, setFormat, availableFormats }` (`@/features/formats/FormatContext`); `react-router` `Outlet`, `useLocation`, `useNavigate`.
- Produces: `ArenaShell` (default export) — the mobile frame rendering `<Outlet/>` between a sticky `AppBar` and sticky `TabBar`, with a format-picker `Sheet` on the `RegPill`.

- [ ] **Step 1: Implement `ArenaShell.tsx`**

```tsx
// src/components/templates/ArenaShell.tsx
import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppBar, RegPill, TabBar, ARENA_TABS, Sheet, Chip, ChipGroup } from '@/design-system/arena';
import { useFormat } from '@/features/formats/FormatContext';

const ROUTE_BY_TAB: Record<string, string> = { calc: '/', teams: '/teams', sp: '/ev-converter', speed: '/speed-tiers' };
const TAB_BY_PATH = (path: string): string => {
  if (path.startsWith('/teams')) return 'teams';
  if (path.startsWith('/ev-converter')) return 'sp';
  if (path.startsWith('/speed-tiers')) return 'speed';
  return 'calc';
};
const TITLE_BY_TAB: Record<string, string> = { calc: 'Calculator', teams: 'Teams', sp: 'EV / SP', speed: 'Speed tiers' };

const ArenaShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { format, setFormat, availableFormats } = useFormat();
  const [regOpen, setRegOpen] = useState(false);
  const active = TAB_BY_PATH(location.pathname);
  const formats = availableFormats.length ? availableFormats : [format];

  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column',
      minHeight: '100vh', background: 'var(--bg-page)', fontFamily: 'var(--font-ui)', color: 'var(--text-body)',
    }}>
      <AppBar title={TITLE_BY_TAB[active]} right={<RegPill value={format} onClick={() => setRegOpen(true)} />} />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'var(--tabbar-h)' }}>
        <Outlet />
      </main>
      <TabBar active={active} tabs={ARENA_TABS} onChange={(id) => navigate(ROUTE_BY_TAB[id] ?? '/')} />
      <Sheet open={regOpen} onClose={() => setRegOpen(false)} title="Regulation">
        <ChipGroup wrap>
          {formats.map((f) => (
            <Chip key={f} active={f === format} onClick={() => { setFormat(f); setRegOpen(false); }}>{f}</Chip>
          ))}
        </ChipGroup>
      </Sheet>
    </div>
  );
};

export default ArenaShell;
```
(The `Sheet` sits inside this `position:relative` frame so it scrims only the app area. The bottom tab bar overlays the scroll region via `paddingBottom` on `<main>`.)

- [ ] **Step 2: Branch `Layout.tsx`**

At the top of the `Layout` component body, add:
```tsx
import { useIsMobile } from '@/hooks/useIsMobile';
import ArenaShell from '@/components/templates/ArenaShell';
// …
const Layout: React.FC = () => {
  const isMobile = useIsMobile();
  if (isMobile) return <ArenaShell />;
  // …existing desktop Layout JSX unchanged…
};
```
Do not alter any existing desktop markup — only add the early return.

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run build`
Expected: clean. Manual: `npm run dev`, narrow the window to ≤767px → dark AppBar (title "Calculator", RegPill), bottom tabs (Calculator active); tabs navigate; RegPill opens a format Sheet that changes the format. Widen → original desktop header returns unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/templates/ArenaShell.tsx src/components/templates/Layout.tsx
git commit -m "feat: Arena mobile shell (AppBar + TabBar + format Sheet) behind useIsMobile"
```

---

## Task 9: KO-verdict mapping helper

**Files:**
- Create: `src/design-system/arena/koVerdict.ts`
- Test: `src/design-system/arena/koVerdict.test.ts`

**Interfaces:**
- Produces: `export type KoTone = 'safe' | 'danger' | 'field'`; `export interface KoVerdictResult { verdict: string; confidence: string | null; tone: KoTone }`; `export function koVerdictFromText(koChanceText?: string): KoVerdictResult`. Mirrors the tone rules in `ResultsPanel.getKoStatus`: empty/`--` → survives (safe); guaranteed OHKO → danger; possible/other OHKO → field; anything else (2HKO, 3HKO…) → safe.

- [ ] **Step 1: Write the failing test**

```ts
// src/design-system/arena/koVerdict.test.ts
import { describe, it, expect } from 'vitest';
import { koVerdictFromText } from './koVerdict';

describe('koVerdictFromText', () => {
  it('empty or -- means survives, safe tone', () => {
    expect(koVerdictFromText('')).toEqual({ verdict: 'Survives', confidence: null, tone: 'safe' });
    expect(koVerdictFromText('--')).toEqual({ verdict: 'Survives', confidence: null, tone: 'safe' });
    expect(koVerdictFromText(undefined)).toEqual({ verdict: 'Survives', confidence: null, tone: 'safe' });
  });
  it('guaranteed OHKO is danger', () => {
    expect(koVerdictFromText('guaranteed OHKO').tone).toBe('danger');
  });
  it('possible OHKO and percentage OHKO are field', () => {
    expect(koVerdictFromText('possible OHKO').tone).toBe('field');
    expect(koVerdictFromText('51.2% chance to OHKO').tone).toBe('field');
  });
  it('multi-hit KO (survives the hit) is safe', () => {
    expect(koVerdictFromText('2HKO').tone).toBe('safe');
    expect(koVerdictFromText('guaranteed 3HKO').tone).toBe('safe');
  });
  it('passes the source text through as the verdict', () => {
    expect(koVerdictFromText('possible OHKO').verdict).toBe('possible OHKO');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/arena/koVerdict.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/design-system/arena/koVerdict.ts
export type KoTone = 'safe' | 'danger' | 'field';
export interface KoVerdictResult { verdict: string; confidence: string | null; tone: KoTone }

export function koVerdictFromText(koChanceText?: string): KoVerdictResult {
  const text = (koChanceText ?? '').trim();
  if (!text || text === '--') return { verdict: 'Survives', confidence: null, tone: 'safe' };
  const lower = text.toLowerCase();
  const ohko = lower.includes('ohko');
  const guaranteed = lower.includes('guaranteed');
  let tone: KoTone;
  if (guaranteed && ohko) tone = 'danger';
  else if (ohko) tone = 'field';
  else tone = 'safe';
  return { verdict: text, confidence: null, tone };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/design-system/arena/koVerdict.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/design-system/arena/koVerdict.ts src/design-system/arena/koVerdict.test.ts
git commit -m "feat: KO-verdict tone mapping helper for the Arena HUD"
```

---

## Task 10: Arena result HUD (single direction)

**Files:**
- Create: `src/features/damage-calculator/components/mobile/ArenaHud.tsx`

**Interfaces:**
- Consumes: `CalcState` (`@/features/damage-calculator/hooks/useCalculatorState`), `DamageResult` (`@/components/organisms/ResultsPanel`), `Sprite`, `Icon`, `KOVerdict`, `koVerdictFromText`. Sprite dex = `state[side].selectedId`; species name = looked up from `pokemonList`.
- Produces: `export function ArenaHud(p: { state: CalcState; dir: 'p1'|'p2'; onSwap: () => void; p1Results: (DamageResult|null)[]; p2Results: (DamageResult|null)[]; nameOf: (id: number|null) => string }): JSX.Element`. Renders the pinned matchup + readout for the active direction (`dir` attacks the other side using its `activeMoveIndex`).

- [ ] **Step 1: Implement** (structure mirrors the DS `Calculator.jsx` HUD)

```tsx
// src/features/damage-calculator/components/mobile/ArenaHud.tsx
import React from 'react';
import type { CalcState } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import { Sprite, Icon, KOVerdict, koVerdictFromText } from '@/design-system/arena';

export function ArenaHud({ state, dir, onSwap, p1Results, p2Results, nameOf }: {
  state: CalcState; dir: 'p1' | 'p2'; onSwap: () => void;
  p1Results: (DamageResult | null)[]; p2Results: (DamageResult | null)[];
  nameOf: (id: number | null) => string;
}) {
  const atk = state[dir];
  const def = state[dir === 'p1' ? 'p2' : 'p1'];
  const results = dir === 'p1' ? p1Results : p2Results;
  const r = results[atk.activeMoveIndex] ?? null;
  const ko = koVerdictFromText(r?.koChanceText);
  const pct = r ? `${isNaN(r.minPercent) ? '0.0' : r.minPercent}–${isNaN(r.maxPercent) ? '0.0' : r.maxPercent}%` : '—';
  const dmg = r ? `${r.minDamage}–${r.maxDamage} dmg` : 'Pick a move';
  const moveName = r?.moveName ?? 'No move';

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20, background: 'var(--navy-850)',
      borderBottom: '1px solid var(--line-2)', boxShadow: 'var(--shadow-hud)',
      padding: '14px var(--gutter) 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Sprite dex={atk.selectedId} name={nameOf(atk.selectedId)} size={40} ring tone="accent" />
        <button onClick={onSwap} aria-label="Swap direction" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'inline-flex' }}>
          <Icon name="chevron-right" size={18} color="var(--ink-3)" />
        </button>
        <Sprite dex={def.selectedId} name={nameOf(def.selectedId)} size={40} ring tone="danger" />
        <div style={{ minWidth: 0, flex: 1, marginLeft: 2 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>{moveName}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nameOf(atk.selectedId)} <span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>vs</span> {nameOf(def.selectedId)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-readout)', fontWeight: 700, color: 'var(--ink-1)', letterSpacing: 'var(--ls-readout)', lineHeight: 1 }}>{pct}</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>{dmg}</div>
        </div>
        <KOVerdict verdict={ko.verdict} confidence={ko.confidence} tone={ko.tone} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify + Commit**

Run: `npm run type-check`
```bash
git add src/features/damage-calculator/components/mobile/ArenaHud.tsx
git commit -m "feat: Arena single-direction result HUD"
```

---

## Task 11: Arena mon card (core controls)

**Files:**
- Create: `src/features/damage-calculator/components/mobile/ArenaMonCard.tsx`

**Interfaces:**
- Consumes: `CalcState`, `CalcAction`, `Card`, `CardHeader`, `Sprite`, `TypeBadge`, `ItemIcon`, `SelectRow`, `StatField`, `StatGrid`, `Icon`; `REVERSE_TYPE_IDS`? No — `state[side].type1/type2` are already type strings. `getFormattedNature`? nature string is in `state[side].nature`.
- Produces: `export function ArenaMonCard(p: { side: 'p1'|'p2'; role: 'Attacker'|'Defender'; state: CalcState; dispatch: React.Dispatch<CalcAction>; nameOf: (id:number|null)=>string; onOpenPicker: (field: 'species'|'move'|'ability'|'item'|'nature') => void; onOpenAdvanced: () => void }): JSX.Element`. Presents species/types header, defender HP bar, Move/Ability/Item/Nature `SelectRow`s, editable SP `StatGrid`, and an "Advanced" opener. Tapping a `SelectRow` calls `onOpenPicker` (the picker Sheets are owned by `ArenaCalculator`, Task 13).

- [ ] **Step 1: Implement**

```tsx
// src/features/damage-calculator/components/mobile/ArenaMonCard.tsx
import React from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import { Card, CardHeader, Sprite, TypeBadge, ItemIcon, SelectRow, StatField, StatGrid } from '@/design-system/arena';

const SP_FIELDS: { label: string; key: keyof CalcState['p1']; }[] = [
  { label: 'HP', key: 'spHp' }, { label: 'Atk', key: 'spAtk' }, { label: 'Def', key: 'spDef' },
  { label: 'SpA', key: 'spSpa' }, { label: 'SpD', key: 'spSpd' }, { label: 'Spe', key: 'spSpe' },
];
const SP_ACTION_KEY: Record<string, string> = { spHp: 'spHp', spAtk: 'spAtk', spDef: 'spDef', spSpa: 'spSpa', spSpd: 'spSpd', spSpe: 'spSpe' };

export function ArenaMonCard({ side, role, state, dispatch, nameOf, onOpenPicker, onOpenAdvanced }: {
  side: 'p1' | 'p2'; role: 'Attacker' | 'Defender';
  state: CalcState; dispatch: React.Dispatch<CalcAction>;
  nameOf: (id: number | null) => string;
  onOpenPicker: (field: 'species' | 'move' | 'ability' | 'item' | 'nature') => void;
  onOpenAdvanced: () => void;
}) {
  const s = state[side];
  const tone = role === 'Attacker' ? 'accent' : 'danger';
  const activeMove = s.moves[s.activeMoveIndex];
  const types = [s.type1, s.type2].filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader
        title={<button onClick={() => onOpenPicker('species')} style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0 }}>{nameOf(s.selectedId) || 'Select Pokémon'}</button>}
        sub={role}
        icon={<Sprite dex={s.selectedId} name={nameOf(s.selectedId)} size={48} ring tone={tone} />}
        right={<div style={{ display: 'flex', gap: 4 }}>{types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>}
      />

      {role === 'Defender' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--ink-3)' }}>Current HP</span>
          <div style={{ flex: 1, height: 8, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: s.hpPercent + '%', height: '100%', background: 'var(--safe)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{s.hpPercent}%</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <SelectRow label="Move" value={activeMove?.nameEn ?? 'None'} leading={s.type1 ? <TypeBadge type={s.type1} size="sm" /> : null} onClick={() => onOpenPicker('move')} />
        <SelectRow label="Ability" value={s.activeAbility ?? 'None'} onClick={() => onOpenPicker('ability')} />
        <SelectRow label="Item" value={s.item ?? 'None'} leading={<ItemIcon item={s.item} size={18} />} onClick={() => onOpenPicker('item')} />
        <SelectRow label="Nature" value={s.nature} onClick={() => onOpenPicker('nature')} />
      </div>

      <StatGrid>
        {SP_FIELDS.map(({ label, key }) => (
          <StatField
            key={key}
            label={label}
            value={s[key] as number}
            active={(s[key] as number) > 0}
            onChange={(e) => dispatch({ type: 'SET_SP', payload: { side, key: SP_ACTION_KEY[key as string], val: Number(e.target.value) || 0 } })}
          />
        ))}
      </StatGrid>

      <button onClick={onOpenAdvanced} style={{
        marginTop: 12, width: '100%', minHeight: 44, borderRadius: 'var(--r-sm)',
        background: 'var(--surface-inset)', border: '1px solid var(--line-2)',
        color: 'var(--text-body)', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', fontWeight: 600, cursor: 'pointer',
      }}>Advanced</button>
    </Card>
  );
}
```
(`activeMove?.nameEn` — `MoveData` carries `nameEn`; if the field differs, use the same accessor `ResultsPanel`/`MoveSearchSelect` uses. `SET_SP` payload `key` must be the `SideState` field name, e.g. `spAtk` — verified against the reducer's `SET_SP` which assigns `state[key] = val`.)

- [ ] **Step 2: Verify + Commit**

Run: `npm run type-check`
```bash
git add src/features/damage-calculator/components/mobile/ArenaMonCard.tsx
git commit -m "feat: Arena mon card with core controls + editable SP grid"
```

---

## Task 12: Field conditions + advanced/move-picker sheets

**Files:**
- Create: `src/features/damage-calculator/components/mobile/ArenaFieldConditions.tsx`, `ArenaAdvancedSheet.tsx`, `ArenaMovePickerSheet.tsx`

**Interfaces:**
- Produces:
  - `export function ArenaFieldConditions(p: { state: CalcState; dispatch: React.Dispatch<CalcAction> }): JSX.Element` — DS `Card` + `ChipGroup`s (Weather/Terrain/Target/Auras) + `Toggle` (Gravity), wired to `SET_WEATHER`/`SET_TERRAIN`/`SET_SPREAD_TARGET`/`TOGGLE_FIELD_AURA`/`TOGGLE_GRAVITY`.
  - `export function ArenaMovePickerSheet(p: { open: boolean; onClose: () => void; side: 'p1'|'p2'; state: CalcState; dispatch: React.Dispatch<CalcAction>; results: (DamageResult|null)[] }): JSX.Element` — lists the four move slots with `TypeBadge` + per-move `min–max%`; tap → `SET_ACTIVE_MOVE_SLOT` + close.
  - `export function ArenaAdvancedSheet(p: { open: boolean; onClose: () => void; side: 'p1'|'p2'; state: CalcState; dispatch: React.Dispatch<CalcAction>; onApplySpread: (side:'p1'|'p2', spread: Spread) => void; onResetBuild: (side:'p1'|'p2') => void; onImportShowdown: () => void }): JSX.Element` — the overflow controls (stat stages, side effects, crit/hits, fainted count, type override, Aegislash form, HP%, presets, reset, Showdown import), each wired to its existing action.

- [ ] **Step 1: Implement `ArenaFieldConditions.tsx`** (mirror DS `FieldChips`, wired to real field actions)

```tsx
// src/features/damage-calculator/components/mobile/ArenaFieldConditions.tsx
import React from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import { Card, ChipGroup, Chip, Toggle, Icon, Badge } from '@/design-system/arena';

const WEATHER = ['None', 'Sun', 'Rain', 'Sandstorm', 'Snow'] as const;
const TERRAIN = ['None', 'Electric', 'Grassy', 'Misty', 'Psychic'] as const;
const AURAS: { label: string; key: 'isFairyAura' | 'isDarkAura' | 'isAuraBreak' }[] = [
  { label: 'Fairy Aura', key: 'isFairyAura' }, { label: 'Dark Aura', key: 'isDarkAura' }, { label: 'Aura Break', key: 'isAuraBreak' },
];

export function ArenaFieldConditions({ state, dispatch }: { state: CalcState; dispatch: React.Dispatch<CalcAction> }) {
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'var(--sp-4)' }}>
        <Icon name="cloud-sun" size={18} color="var(--field)" />
        <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--ink-1)' }}>Field conditions</span>
        {state.weather !== 'None' && <Badge tone="field">{state.weather}</Badge>}
      </div>
      <div style={{ padding: '0 0 var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ChipGroup label="Weather">
          {WEATHER.map((w) => <Chip key={w} tone="field" active={state.weather === w} onClick={() => dispatch({ type: 'SET_WEATHER', payload: w })}>{w}</Chip>)}
        </ChipGroup>
        <ChipGroup label="Terrain">
          {TERRAIN.map((t) => <Chip key={t} active={state.terrain === t} onClick={() => dispatch({ type: 'SET_TERRAIN', payload: t })}>{t}</Chip>)}
        </ChipGroup>
        <ChipGroup label="Target">
          <Chip active={!state.isSpreadTarget} onClick={() => dispatch({ type: 'SET_SPREAD_TARGET', payload: false })}>Single</Chip>
          <Chip active={state.isSpreadTarget} onClick={() => dispatch({ type: 'SET_SPREAD_TARGET', payload: true })}>Spread</Chip>
        </ChipGroup>
        <ChipGroup label="Auras">
          {AURAS.map((a) => <Chip key={a.key} active={state[a.key]} onClick={() => dispatch({ type: 'TOGGLE_FIELD_AURA', payload: a.key })}>{a.label}</Chip>)}
        </ChipGroup>
        <div style={{ padding: '0 var(--gutter)' }}>
          <div style={{ paddingTop: 4, borderTop: '1px solid var(--line-1)' }}>
            <Toggle label="Gravity" on={state.isGravity} onChange={() => dispatch({ type: 'TOGGLE_GRAVITY' })} style={{ paddingTop: 12 }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Implement `ArenaMovePickerSheet.tsx`**

```tsx
// src/features/damage-calculator/components/mobile/ArenaMovePickerSheet.tsx
import React from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import { Sheet, SelectRow } from '@/design-system/arena';

export function ArenaMovePickerSheet({ open, onClose, side, state, dispatch, results }: {
  open: boolean; onClose: () => void; side: 'p1' | 'p2';
  state: CalcState; dispatch: React.Dispatch<CalcAction>; results: (DamageResult | null)[];
}) {
  const s = state[side];
  return (
    <Sheet open={open} onClose={onClose} title="Active move">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {s.moves.map((m, i) => {
          const r = results[i];
          const pct = r ? `${r.minPercent}–${r.maxPercent}%` : '';
          return (
            <SelectRow
              key={i}
              label={`Slot ${i + 1}`}
              value={<span>{m?.nameEn ?? 'Empty'} {pct && <span style={{ color: 'var(--ink-3)', marginLeft: 6 }}>{pct}</span>}</span>}
              onClick={() => { dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side, index: i } }); onClose(); }}
              style={s.activeMoveIndex === i ? { borderColor: 'var(--accent-soft-line)', background: 'var(--accent-soft)' } : {}}
            />
          );
        })}
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 3: Implement `ArenaAdvancedSheet.tsx`** — one `Sheet` with sections. Wire each control to its existing action (verified against `useCalculatorState`):
  - Stat stages: for each of `atk/def/spa/spd/spe`, a −6…+6 stepper → `SET_STAT_STAGE {side, stat, val}` (reads `state[side].stages[stat]`).
  - Side effects: `Toggle`s for `isReflect/isLightScreen/isAuroraVeil/isHelpingHand/isFriendGuard/isTailwind` → `TOGGLE_SIDE_EFFECT {side, effect}`.
  - Per-move crit + hits: for each slot, a crit `Toggle` → `TOGGLE_MOVE_CRIT {side, index}` (reads `movesForceCrit[index]`) and a hits stepper → `SET_MOVE_HITS {side, index, val}` (reads `movesHits[index]`).
  - Fainted count (Beast Boost): stepper → `SET_FAINTED_COUNT {side, val}`.
  - Type override: `Toggle` `isTypeOverridden` → `TOGGLE_TYPE_OVERRIDE {side}`; when on, two type `SelectRow`s → `SET_TYPE {side, slot, type}`.
  - Aegislash form: if `state[side].selectedId === AEGISLASH_ID`, a `Toggle` → `TOGGLE_AEGISLASH_FORM {side}`.
  - Attacker HP %: a slider/stepper → `SET_HP_PERCENT {side, val}`.
  - Build presets: buttons "Max HB" / "Max HD" → `onApplySpread(side, spread)` using the existing `Spread`s from `@/features/damage-calculator/utils/common-spreads` (import `MAX_HB`, `MAX_HD` — use the same spread objects `BuildPresets` uses; check that file for the exported names). Reset → `onResetBuild(side)`.
  - Showdown import: a button → `onImportShowdown()` (opens the existing `ShowdownImportModal` flow owned by `ArenaCalculator`).

  Use DS `Sheet`, `Toggle`, `SelectRow`, `Chip`, and small inline steppers (a −/＋ pair of ≥44px buttons around a `font-display` number). Section headings use 11px uppercase micro-labels (the DS's one allowed all-caps).

- [ ] **Step 4: Verify + Commit**

Run: `npm run type-check`
```bash
git add src/features/damage-calculator/components/mobile/ArenaFieldConditions.tsx src/features/damage-calculator/components/mobile/ArenaMovePickerSheet.tsx src/features/damage-calculator/components/mobile/ArenaAdvancedSheet.tsx
git commit -m "feat: Arena field conditions, move-picker + advanced overflow sheets"
```

---

## Task 13: Compose `ArenaCalculator` + branch the page

**Files:**
- Create: `src/features/damage-calculator/components/mobile/ArenaCalculator.tsx`
- Modify: `src/pages/DamageCalculator/index.tsx`

**Interfaces:**
- Consumes: everything above; the existing pickers `PokemonSearchSelect`, `MoveSearchSelect`, `ItemSearchSelect`, and ability/nature selectors (reused inside `Sheet`s); `useCalculatorActions` for `handleSelectPokemon`/`handleImportShowdown`.
- Produces: `export function ArenaCalculator(p: { state; dispatch; pokemonList; moveList; p1Results; p2Results; p1MaxHp; p2MaxHp; actions; onApplySpread; onResetBuild; onOpenScan: () => void }): JSX.Element`.

- [ ] **Step 1: Implement `ArenaCalculator.tsx`** — owns the presentation-only local state and the picker Sheets:
  - `const [dir, setDir] = useState<'p1'|'p2'>('p1')` (HUD direction; `onSwap` flips it).
  - `const [picker, setPicker] = useState<{ side; field } | null>(null)` and `const [advancedSide, setAdvancedSide] = useState<'p1'|'p2'|null>(null)` and `const [movePickerSide, setMovePickerSide] = useState<'p1'|'p2'|null>(null)`.
  - `nameOf(id)` = `pokemonList.find(p => p.id === id)?.nameEn ?? '—'`.
  - Layout: `<ArenaHud .../>` then a `div` (`padding: var(--sp-4) var(--gutter) var(--sp-7)`, `gap:14`) containing `ArenaMonCard side="p1" role="Attacker"`, `ArenaMonCard side="p2" role="Defender"`, a "Scan opponent" `SelectRow`/button → `onOpenScan()`, `ArenaFieldConditions`, and the SP-formula footnote (`--font-mono`, from the DS `Formulas`).
  - Sheets: `ArenaAdvancedSheet` (open when `advancedSide`), `ArenaMovePickerSheet` (open when `movePickerSide`, passing that side's results), and a **picker Sheet** that renders the existing search-select molecule for `picker.field` (species → `PokemonSearchSelect` calling `actions.handleSelectPokemon(side, p)`; move → `MoveSearchSelect` → `SELECT_MOVE_FOR_SLOT`; item → `ItemSearchSelect` → `SET_ITEM`; ability → a list of `state[side].abilities` → `SET_ACTIVE_ABILITY`; nature → a list of natures → `SET_NATURE`). Reuse the molecules for their data/search; the Sheet provides the dark surface.
  - `onOpenPicker(field)` on each card sets `picker = { side, field }`; the Move row instead opens `movePickerSide` (per-move damage list). `onOpenAdvanced` sets `advancedSide`.

- [ ] **Step 2: Branch the page render** in `src/pages/DamageCalculator/index.tsx`

Add `import { useIsMobile } from '@/hooks/useIsMobile';` and `import { ArenaCalculator } from '@/features/damage-calculator/components/mobile/ArenaCalculator';`. Compute `const isMobile = useIsMobile();`. Keep all existing hooks/handlers. Replace the single `return (…)` with:

```tsx
  if (isMobile) {
    return (
      <>
        <ArenaCalculator
          state={state} dispatch={dispatch}
          pokemonList={pokemonList} moveList={moveList}
          p1Results={p1Results} p2Results={p2Results} p1MaxHp={p1MaxHp} p2MaxHp={p2MaxHp}
          actions={actions} onApplySpread={handleApplySpread} onResetBuild={handleResetBuild}
          onOpenScan={() => setIsScanModalOpen(true)}
        />
        <ScanTeamModal
          isOpen={isScanModalOpen}
          onClose={() => { setIsScanModalOpen(false); setCapturedBlob(null); }}
          pokemonList={pokemonList} onLoadPokemon={handleLoadDefender} onLoadAttacker={handleLoadAttacker}
          onSaveTeam={handleSaveOppTeam} externalBlob={capturedBlob}
        />
        <ToastNotification message={toast} />
      </>
    );
  }
  // …existing desktop return unchanged…
```
Leave the existing desktop JSX exactly as-is after this block.

- [ ] **Step 3: Verify (type + build)**

Run: `npm run type-check && npm run build`
Expected: clean.

- [ ] **Step 4: Manual mobile verification**

Run: `npm run dev`; open at ≤767px (device toolbar, 390×844).
- HUD pins on scroll; big % + `KOVerdict` reflect the active move; swap flips direction.
- Attacker/Defender cards: species/move/item/ability/nature pickers open in Sheets and update the readout; SP fields edit; defender HP bar shows.
- Move-picker Sheet lists 4 moves with per-move %; selecting one updates the HUD.
- Advanced Sheet: toggling a side effect / stage / crit / preset changes the result; every control in the reconciliation table is reachable.
- Field chips change weather/terrain/target/auras/gravity.
- "Scan opponent" opens the existing scan modal.
- Widen to desktop → the original calculator is unchanged; run the full desktop calc once to confirm parity.

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaCalculator.tsx src/pages/DamageCalculator/index.tsx
git commit -m "feat: Arena mobile calculator wired to calc state; branch page by viewport"
```

---

## Task 14: Full verification + regression gate

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: all existing tests pass (208+), plus the new `useIsMobile` (3) and `koVerdict` (5). No test touched calc logic, so parity holds.

- [ ] **Step 2: Type + build**

Run: `npm run type-check && npm run build`
Expected: clean.

- [ ] **Step 3: Desktop-unchanged spot check**

At desktop width, confirm the calculator, teams, EV/SP, and speed screens render exactly as before (the `useIsMobile()` branch is `false`, so desktop paths are untouched).

- [ ] **Step 4: Commit any lint/format fixups, then stop for review**

```bash
git add -A && git commit -m "chore: Arena mobile calculator slice — verification pass"
```

---

## Self-Review

- **Spec coverage:** tokens (T2), fonts (T2), icons (T3), Sprite/ItemIcon reconciliation (T5), all named components (T4/6/7), viewport trigger (T1/T8), shell + tabs + RegPill format sheet (T8), single-direction HUD (T10), MonCards + SP + defender HP (T11), field conditions (T12), overflow→Sheet with the full reconciliation table (T12), page branch preserving desktop (T13), voice/tap-target/testing constraints (global + per-task gates). Interim inconsistency for Teams/EV/Speed is inherent to the branch and documented in the spec.
- **Placeholder scan:** the only non-code prose is Task 12 Step 3 (Advanced Sheet), which enumerates each control with its exact verified action + state field — not a placeholder, a wiring checklist; the primitives (`Sheet`, `Toggle`, `SelectRow`, steppers) are fully specified elsewhere.
- **Type consistency:** action payloads (`SET_SP` key = `SideState` field name; `TOGGLE_SIDE_EFFECT` effect union; `SET_STAT_STAGE` stat; `SET_ACTIVE_MOVE_SLOT`) match `useCalculatorState`. Results tuple `(DamageResult|null)[]` and `koVerdictFromText` signature are consistent across HUD/move-picker. Barrel exports match component signatures.

## Open follow-ups (out of this slice)
- Arena-native (dark) redesigns of the reused search-select pickers (interim: existing molecules inside dark Sheets).
- Teams / EV·SP / Speed-tier Arena screens (slices 2–4; interim they ride the shell with existing styling).
