# Arena whole-site redesign — design

**Date:** 2026-07-06
**Status:** Approved
**Source of truth:** Claude Design project "Arena VGC Design System" (`f20e187b-0c82-44ce-879c-8c25a14c2906`)

## Goal

Every page of the site, on both desktop and mobile, wears the Arena VGC Design
System — the dark competitive-HUD look. Visual redesign only: zero behavior
changes.

## Decisions (made with the user)

1. **Scope:** whole site, all viewports (supersedes the earlier
   "Calculator-first, desktop untouched" direction).
2. **Desktop strategy:** re-skin existing desktop layouts in place with Arena
   tokens — keep page structure, grids, and modals; swap the visual language.
   No desktop layout restructuring.
3. **Order:** Phase 1 desktop re-skin first (whole site goes dark in one pass),
   then Phase 2 mobile Arena screen ports.

## Visual language (from the design system readme)

- Page `#0B0E14`; cards `#151A23` with 1px `#232B3A` hairline, 12px radius
  (sheets 16px, pills 999px). Flat — borders do the lifting, not shadows.
- One accent: electric indigo `#4F7DFF`. Semantic: green `#36C281` survives,
  red `#F2566B` KO, amber `#F2B53C` weather/field. Type badges = 16%-tint pills.
- Space Grotesk for titles/numerics, Manrope for UI/body, JetBrains Mono for
  formulas and Showdown paste. Sentence case everywhere; 11px all-caps
  micro-labels are the only exception.
- Hover/press lighten to `#283042`; active = tinted fill + matching border;
  disabled = 45% opacity. Motion 120–180ms `cubic-bezier(0.2,0.7,0.3,1)`.

## Current state

- Branch `feat/arena-mobile-calculator`. Arena tokens + 15 components already
  ported to `src/design-system/arena/` (tokens.css, AppBar, TabBar, Sheet,
  Card, Chip, Badge, TypeBadge, StatField, KOVerdict, Sprite, ItemIcon, …).
- `Layout.tsx` branches on `useIsMobile`: mobile → `ArenaShell` (AppBar +
  TabBar + format Sheet), desktop → old light blue/gray Tailwind theme.
- Mobile Calculator is fully ported (`ArenaCalculator`). Teams, Team Detail,
  Speed Tiers, and EV/SP Converter still render the light desktop pages inside
  the dark shell on mobile.
- Stack: React 19, Tailwind v4 (`@tailwindcss/vite`), react-router 7,
  Capacitor Android. Arena fonts installed via @fontsource.

## Phase 1 — Desktop re-skin

1. **Tokens → Tailwind.** Expose the Arena CSS variables from
   `src/design-system/arena/tokens.css` to Tailwind v4 via `@theme` in
   `src/index.css`, giving semantic utilities (e.g. `bg-arena-page`,
   `bg-arena-card`, `border-arena-line`, `text-arena-accent`). Do not remap
   existing Tailwind palette names — old classes get replaced, not redefined.
2. **Shell.** Re-skin `Layout.tsx` desktop chrome: navy page background,
   card-surface header with hairline border, indigo active nav states, format
   select styled like the RegPill, Space Grotesk wordmark, quiet footer.
3. **Sweep.** Replace light-theme classes across the 6 pages
   (DamageCalculator, Teams, TeamDetail, SpeedTierList, EvSpConverter,
   NotFound) and the shared components in `src/components/`
   (6 atoms, 18 molecules, 11 organisms — panels, forms, modals, sliders,
   badges, tier sections). Structure unchanged; only colors, fonts, borders,
   radii change.
4. **Reuse over restyle.** Where an Arena component is a drop-in replacement
   (TypeBadge, Badge, Chip), use it instead of restyling the old duplicate.
   Showdown import/export textareas switch to JetBrains Mono.
5. Modals stay centered dialogs on desktop but adopt Arena surface styling
   (card navy, hairline, 16px radius, soft pop shadow).

## Phase 2 — Mobile Arena screen ports

Each page branches by `useIsMobile` exactly like
`pages/DamageCalculator/index.tsx` does with `ArenaCalculator`; the mobile
component lives beside the feature (e.g.
`features/teams/components/mobile/`). Reference screens live in the design
project under `ui_kits/arena-app/`.

1. **Teams** (reference: `Teams.jsx`) — create/import actions, team cards with
   count badge, date, sprite row + item icons, Edit/Export/Delete, "No teams
   yet" empty state with a clear next action.
2. **Speed tiers** (reference: `SpeedTiers.jsx`) — sticky base-speed group
   headers, per-Pokémon rows with four computed speed chips (Max+ / Max /
   Uninvested / Min−), tap opens a detail sheet.
3. **EV/SP converter** — no reference screen; extrapolate with SelectRow /
   StatField / StatGrid in the same idiom. Single column, one primary action.
4. **Team detail** — no reference screen; extrapolate from Teams patterns:
   Arena cards per member, editors move into Sheets, 44px tap targets.

## Verification

- `npm test` passes before and after each phase (visual-only change — any
  behavioral test failure is a regression).
- Preview verification per page at desktop width and mobile (360–390px),
  checking against the design-system reference screens where they exist.
- Smoke: calculator produces identical numbers pre/post re-skin; teams CRUD,
  Showdown import/export, and scan flow still work.

## Out of scope

- New features or behavior changes.
- Desktop layout restructuring (single-codebase responsive Arena was
  considered and rejected for now).
- Light mode.
- Upstream edits to the Claude Design project. If the invented EV/SP and
  Team-detail screens turn out well, syncing them back is a separate
  follow-up.
