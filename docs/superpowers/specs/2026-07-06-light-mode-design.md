# Light Mode — Design

**Date:** 2026-07-06
**Status:** Approved

## Goal

Add a light theme to the app. Defaults to the OS `prefers-color-scheme`; a
toggle in both shells overrides it, and the override persists in
`localStorage`. Dark remains the design's default theme.

## Background

All colors flow through CSS custom properties in
`src/design-system/arena/tokens.css` (ported verbatim from the Claude Design
project "Arena VGC Design System", `f20e187b-0c82-44ce-879c-8c25a14c2906`),
exposed as Tailwind utilities via `@theme inline` in `src/index.css`. The
Claude Design project currently has dark tokens only. The only colors outside
tokens are the Pokémon type-color map (`pokemon-types.ts`) and the Sheet
overlay scrim — both intentionally unchanged (type colors are brand colors; a
dark scrim is standard in light UIs too).

## Design

### 1. Light palette — designed in Claude Design first

Extend the Arena VGC Design System project, then port verbatim:

- `tokens/colors.css`: add a `:root[data-theme="light"]` block.
- `tokens/effects.css`: light overrides for the three shadow tokens
  (softer alphas) and `color-scheme`.
- New guidelines card `guidelines/colors-light.card.html` ("Colors — light
  surfaces") so the light ramp is visible in the design pane.

Palette constraints:

- Inverted navy ramp: cool off-white page, white cards, light-gray insets.
- Same electric-indigo accent hue; hover/press darken instead of lighten.
- Semantic green/red/amber darkened to pass WCAG AA as text on white.
- Soft tint alphas reduced to read as tints on light surfaces.
- Pokémon type colors unchanged in both themes.

### 2. Token mechanics (local port)

- Dark stays the default `:root` in `tokens.css` — zero dark churn.
- Append the `:root[data-theme="light"]` block overriding only color,
  shadow, `--bg-appbar`, and `color-scheme` tokens. Layout, typography,
  spacing, radius, and duration tokens are theme-agnostic.
- Micro-refactors so tokens auto-adapt:
  - `--ring`: reference `var(--bg-page)` instead of `var(--navy-900)`
    (same computed value in dark).
  - `color-scheme` moves from `src/index.css` into `tokens.css`
    (`dark` on `:root`, `light` in the light block).

### 3. Theme state — `src/design-system/arena/theme.ts`

~30 lines, no context provider:

- Resolution: `localStorage.theme` (`"light"` / `"dark"`) if set, else
  `prefers-color-scheme`.
- `setTheme(t)`: sets `data-theme` on `<html>` and persists to
  `localStorage`.
- `useTheme()`: hook returning `[theme, setTheme]`; subscribes to
  `matchMedia('(prefers-color-scheme: light)')` changes so the app follows
  live OS switches when no override is stored.
- Inline `<script>` in `index.html` (~3 lines) applies the resolved theme
  before first paint — no dark flash.

### 4. Toggle UI

Sun/moon icon button following existing button/Icon patterns:

- Desktop: in the `Layout.tsx` header nav, next to the Regulation select.
- Mobile: in the ArenaShell `AppBar` `right` slot, next to the RegPill.
- `Icon.tsx` gains `sun` and `moon` glyphs (mirrored to the Claude Design
  `components/core/Icon.jsx`).

### 5. Testing & verification

- Vitest for `theme.ts`: stored override beats OS preference; toggle flips
  the `data-theme` attribute and persists; no stored value follows
  `matchMedia`.
- Manual verification via dev server: screenshot both themes at desktop and
  mobile viewports; check text contrast on cards, insets, and semantic
  (safe/danger/field) surfaces.

## Out of scope

- Re-tuning Pokémon type colors per theme.
- Theming the Sheet scrim.
- Any component-level color changes — components already consume semantic
  tokens.

## Files touched

| File | Change |
|---|---|
| Claude Design `tokens/colors.css`, `tokens/effects.css`, `guidelines/colors-light.card.html`, `components/core/Icon.jsx` | light theme + sun/moon glyphs at the source of truth |
| `src/design-system/arena/Icon.tsx` | `sun` + `moon` glyphs |
| `src/design-system/arena/tokens.css` | light block ported; `--ring` + `color-scheme` refactors |
| `src/index.css` | remove `color-scheme` (moved to tokens) |
| `index.html` | pre-paint theme script |
| `src/design-system/arena/theme.ts` (new) | resolution + persistence + hook |
| `src/design-system/arena/theme.test.ts` (new) | unit tests |
| `src/components/templates/Layout.tsx` | desktop toggle |
| `src/components/templates/ArenaShell.tsx` | mobile toggle |
