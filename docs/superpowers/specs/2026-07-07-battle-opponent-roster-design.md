# Battle Opponent Roster

Date: 2026-07-07
Branch: feat/battle-roster
Status: Design approved — ready for implementation planning

## Goal

Turn a battle into a session: scan the opponent's team once at team preview,
confirm their six, and let every in-battle interaction benefit from that
knowledge — scans constrained to the confirmed six (plus their forms), or a
one-tap pick from the six with no scan at all. Discard the roster when the
battle ends. The opponent cannot use anything outside the six they brought,
so a confirmed roster makes in-battle recognition near-unmissable and manual
selection instant.

## Decisions made during brainstorming

- **Lifecycle is implicit.** Confirming a team-preview scan on the
  calculator page creates the battle roster; a persistent strip on the calc
  shows it; Clear (✕) on the strip ends it. No separate start/stop-battle
  concept. Confirming a new team-preview scan replaces the roster in place.
- **Persistence: localStorage until cleared or replaced** (key
  `scan.battleRoster`, same pattern as `scan.engine` / the build store).
  Survives reloads and carries across a bo3 set (same six every game).
- **Mask scope: the six + their form families** (base + Mega/alternate-form
  ids — forms are separate classifier classes). Safe whether or not
  nameplate mini-sprites change on Mega Evolution.
- **Strip interaction: tap → popover** with "Set as defender" and
  "Set as attacker" (both directions matter in the calc). Loads apply saved
  builds exactly as scan results do; HP loads as 100%.
- **No HP memory** — the roster stores species ids only. HP flows into the
  calc only at the moment of a scan.
- **Preview confirm shows opponent rows only** in this flow — the You side
  is hidden in the calc-hosted modal's team-preview results.
- **Implementation shape: page-local hook + localStorage** (approach A) —
  no new context, no DB involvement. The roster's only consumer is the
  calculator page; if another page ever needs it, graduating to a context
  is a mechanical refactor.

## Components

### 1. `useBattleRoster` (calculator page hook)

`{ roster: number[] | null, confirmRoster(ids: number[]), clearRoster() }`
— 1–6 pokemon ids, species only, localStorage-backed (`scan.battleRoster`).
`confirmRoster` overwrites any existing roster. Empty arrays are rejected
(confirm is disabled at 0 entries).

### 2. Calc-hosted scan modal changes (`ScanTeamModal`)

Two new props, both optional so the Teams-page host is untouched:
- `battleRoster: number[] | null` — when set and a BATTLE frame is scanned,
  the opponent-side mask becomes the roster's form-family set (see §4).
- `onConfirmRoster(ids: number[])` — when set and a TEAM-PREVIEW frame is
  scanned: player-side rows are hidden, and the primary action becomes
  **"Confirm opponent team"** (fires the callback with the confirmed ids
  and closes). "Save opp team to Teams" remains as the secondary action.
Fewer than 6 detected is fine — rows can be added via the existing
"+ Add Pokémon" / search before confirming.

### 3. Opponent strip (calculator page)

Rendered when a roster is active: up to six mini-sprites (`PokemonImage`)
plus Clear (✕). Tap a sprite → popover with "Set as defender" /
"Set as attacker", wired to the page's existing `handleLoadDefender` /
`handleLoadAttacker` (saved builds apply; `hpPercent` null → 100%).
Clear calls `clearRoster()` and removes the strip.

### 4. Per-side masks (the one pipeline change)

`scanFrame`'s single `legalIds: Set<number>` becomes per-side — a
`(side: ScanSide) => Set<number>` lookup (single-set callers keep current
behavior via a trivial adapter). With a roster active, BATTLE scans use:
opponent side → the roster form-family set; player side → the full format
set (your own Pokémon are not on the opponent's roster). `useTeamScan`
threads it through. `classifier.classify` and the descriptor path already
accept arbitrary sets — no changes below `scanFrame`. Team-preview scans
never use the roster mask (they are what creates the roster).

### 5. Form-family expansion

A helper mapping each confirmed species id to its family (base +
Mega/alternate forms). Reuses the sibling-forms logic already surfacing
alternates in the scan confirm UI if it is extractable as a function;
otherwise the identifier-root join with the curated irregular-name map
documented in the original scan spec (`mr-mime`, `ho-oh`, `type-null`,
`tapu-koko`, `nidoran-f`, `urshifu-single-strike`). The opponent mask is
the union of the six families.

## Error handling & edge cases

- **No roster → nothing changes.** Every scan behaves exactly as today;
  this feature is purely additive above the detection layer.
- **Wrong roster escape hatch:** masked battle rows show top-3 from the
  family set, but "Choose another Pokémon" full-format search stays
  unmasked in every row. Fixing the roster = rescan preview (replace) or
  Clear.
- **Roster active, team-preview frame scanned:** normal preview flow;
  confirming replaces the roster.
- **Format switched mid-battle:** the roster is independent of format (it
  was confirmed against the actual opponent); the strip stays.
- **Corrupt/invalid localStorage value:** treated as no roster (cleared on
  read).

## Testing

- **Unit:** `useBattleRoster` persist/replace/clear/corrupt-value;
  form-family expansion incl. hyphen traps and a Mega case; `scanFrame`
  sided masks — opponent tile classified under the roster set, player tile
  under the format set, single-set adapter identical to today.
- **Component:** calc-hosted modal hides You rows in preview mode and shows
  "Confirm opponent team"; Teams-page host unchanged; confirm → strip
  renders; chip popover fires the load handlers; Clear removes strip and
  key.
- **Regression:** all existing scan tests and the scan-mode golden floor
  untouched (default single-set path identical).

## Out of scope

- HP memory on the strip (decided against).
- Roster on pages other than the calculator; app-wide context.
- Auto-expiry / battle timers.
- Any detection-layer changes (mode vote, croppers, HP reader).
- Saving the roster as a Team (the existing "Save opp team to Teams"
  already covers that).
