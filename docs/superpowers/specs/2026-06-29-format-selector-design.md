# Pokémon Champions damage calculator — Spec 3: regulation format selector

Date: 2026-06-29
Status: implemented — global regulation format selector shipped and merged to main via PR #5.

A UI slice that surfaced from Spec 2: the Reg M-B dataset is on `main`, but **"Regulation M-A"
is hardcoded in every data fetch**, so users can't actually pick M-B. This adds a global
regulation selector. (Not one of the original 7-item decomposition; it's the first UI-facing
slice, unblocking the M-B data.)

---

## Current state

- **No app-wide state** — no Context, store, or zustand. Each page fetches its own data in a
  `useEffect` with the literal `'Regulation M-A'` baked into the query.
- The format is hardcoded in 5 consumers (plus one already-parameterized helper):
  - `src/pages/DamageCalculator/index.tsx` (inline query)
  - `src/pages/Teams/index.tsx` (inline query)
  - `src/pages/SpeedTierList/index.tsx` (inline query + the hardcoded page title
    "Regulation M-A Speed Tiers" and empty-message)
  - `src/services/pokemon.ts` (`fetchRegulationMAPokemonSpeed`, hardcoded to M-A)
  - `src/features/teams/hooks/useTeamDetail.ts` (`getPokemonListByFormat('Regulation M-A')`,
    the member picker)
  - `src/db/repositories/pokemon.repo.ts` — `getPokemonListByFormat(formatName)` already takes
    the format as a parameter (default `'Regulation M-A'`); callers just need to pass it.
- `Layout` (`src/components/templates/Layout.tsx`) is a simple header (title + nav links +
  `<Outlet/>`) and holds no state — the natural home for a global selector.
- `formats` table currently holds `Regulation M-A` (270 legal) and `Regulation M-B` (309).

## Goal

Let the user choose the active regulation from a global control; every Pokémon list in the app
(Damage Calculator, Teams, Speed Tiers) filters to that regulation, the choice persists across
reloads, and it defaults to the latest regulation.

## Success criteria

1. A regulation dropdown in the header lists the regulations from the `formats` table and
   switching it re-filters the Pokémon lists on Damage Calculator, Teams, and Speed Tiers.
2. The selection **persists** across reloads (localStorage) and defaults to the **latest**
   regulation (currently Reg M-B) on first use.
3. No `'Regulation M-A'` literal remains in a data-fetch path; all read the selected format.
4. `npm test`, `npm run type-check`, and `npm run build` pass; the app runs and switching
   formats visibly changes the available Pokémon (e.g. Mega Raichu Y appears under M-B, not M-A).

---

## Design (Approach A — React Context)

### Shared state: `FormatProvider` + `useFormat()`

New module `src/features/formats/FormatContext.tsx` exposing a `useFormat()` hook returning
`{ format, setFormat, availableFormats }`:

- On mount, query the `formats` table for the list of names → `availableFormats` (so the
  dropdown auto-includes any future regulation; no hardcoded list).
- Initial `format` resolved by a **pure helper** `resolveInitialFormat(stored, available)`:
  - if `stored` is in `available` → use it;
  - else → the **latest** available (regulation names sort lexically, so `Regulation M-B` >
    `Regulation M-A`; pick the max), or the only/first one if sorting is ambiguous.
- `setFormat` writes through to `localStorage['champions.format']`.
- Until `availableFormats` loads, render children with a sensible provisional format (the
  stored value or the constant default) so pages don't flash empty.

### Wiring

- Wrap `<Routes>` in `<FormatProvider>` in `src/App.tsx`.
- **Header dropdown** in `Layout.tsx`: a styled `<select>` at the right of the nav bound to
  `useFormat()`, options from `availableFormats`, label "Regulation".
- **Thread `format` into the 5 consumers** — replace the `'Regulation M-A'` literal with
  `format` from `useFormat()` and add `format` to each `useEffect` dependency array so a change
  re-fetches:
  - `DamageCalculator/index.tsx`, `Teams/index.tsx`, `SpeedTierList/index.tsx` (inline queries),
  - `services/pokemon.ts` (`fetchRegulationMAPokemonSpeed` → accept a `formatName` arg; rename
    to `fetchPokemonSpeedByFormat` and update its caller),
  - `useTeamDetail.ts` (pass `format` to `getPokemonListByFormat`).
- Make `SpeedTierList`'s title and empty-message use the selected `format` instead of the
  hardcoded "Regulation M-A" strings.

### Edge handling

- A stored format no longer present in `availableFormats` falls back to the latest (handled by
  `resolveInitialFormat`).
- The team-detail member picker uses the **global** format. A saved team containing Pokémon not
  legal in the selected regulation is an out-of-scope edge (the team still loads; only the
  add/edit picker is filtered).

### Testing

- **Unit (node, matches existing style):** `resolveInitialFormat(stored, available)` — returns
  the stored value when valid, the latest when stored is absent/invalid, and handles an empty
  list. Plus the localStorage key/round-trip if the persist logic is factored into a pure helper.
- **UI wiring:** covered by `npm run type-check` + `npm run build` + a manual run (switch the
  dropdown, confirm the Pokémon list changes — e.g. a M-B-only Mega appears under M-B only).
- No jsdom/`@testing-library/react` is added — React component testing stays out of scope to
  match the project's node-only test setup.

---

## Out of scope

- Per-team format memory (remembering which regulation a team was built under).
- Warning/badging when a saved team contains Pokémon illegal in the selected regulation.
- Any visual redesign of the header beyond adding the dropdown.

## Risks / open questions

- **`useEffect` dependency churn:** adding `format` to deps re-fetches on change (intended);
  ensure no fetch loops (the queries don't write state that feeds back into `format`).
- **Provisional format flash:** before `availableFormats` resolves, the provisional format must
  match what pages fetch with, to avoid a brief wrong-list flash; the helper's default covers it.
- **`services/pokemon.ts` rename** touches its caller (SpeedTierList or wherever
  `fetchRegulationMAPokemonSpeed` is used) — the plan enumerates the exact call sites.
- Regulation name sort as "latest" is a heuristic; if a future naming breaks lexical order, the
  default needs revisiting (low risk for `M-A`/`M-B`/`M-C`…).
