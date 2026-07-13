# Portrait "scan my team" review — design

## Goal

Bring the landscape scan-my-team review (glance → per-mon fix editor) to the
**portrait** mobile viewport as a full-screen flow, reusing the existing
components rather than forking portrait copies.

## Approach

The scan components use inline styles (no media queries), so each reads
`useViewportMode()` and branches layout on `portrait = mode === 'arena'`.
Landscape (`arena-landscape`) and desktop keep today's layout unchanged.

### Component reflows

- **`ArenaReviewMon`** (per-mon editor) — the side-by-side `moves | stats` body
  (left `48%` + right `flex:1`) stacks vertically in portrait into one scrolling
  body: moves/ability/item, then stats/sliders/EVs. Header and footer stay;
  footer wraps if tight. Benefits the landscape standalone member-review and the
  paste-edit flow too (no change on wide screens).
- **`ArenaPlayerScanReview`** (glance) — glance grid `repeat(3,1fr)` becomes a
  single column in portrait (scrolling list). Capture card, species band, and
  Clear/Save bar are already vertical-friendly. Detail is delegated to
  `ArenaReviewMon`.
- **`ArenaAddTeam`** (Scan/Paste host) — paste-preview card grid `repeat(3,…)`
  becomes one column in portrait; adds an `initialMethod` prop so it can open on
  the Scan tab.

### Host wiring (`TeamsPage`, portrait `arena` branch)

Today portrait "scan my team" opens `PlayerScanModal` (a modal). Change the
portrait branch to render **`ArenaAddTeam` full-screen** when `creatingTeam`
(mirroring the landscape pattern). The portrait teams list's scan entry sets
`creatingTeam` and opens `ArenaAddTeam` with `initialMethod="scan"`. Portrait's
paste/import entries stay as they are to limit blast radius. `PlayerScanModal` /
`PlayerScanPanel` remain for the **desktop** path (untouched).

## Scope limits

Portrait only. No new features — responsive layout + host rewiring only. Desktop
scan modal untouched.

## Verification

- `tsc` clean; scan tests stay green (logic unchanged — only layout branches).
- Drive a portrait viewport (390×844): capture → glance (1-col) → tap a card →
  stacked editor → species change → save. Re-check landscape for no regression.
