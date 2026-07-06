# My-Team Chips in the Attacker Panel

Date: 2026-07-07
Branch: feat/my-team-chips
Status: Design approved — ready for implementation planning

## Goal

Mirror the opponent roster on your own side: select one of your saved Teams
once, and the Attacker panel shows its members as chips — tap loads that
member's FULL saved build as attacker. With a team selected, battle scans
also mask player-side recognition to your six (+form families), the same
near-unmissable recognition the opponent side got.

## Decisions

- **Team picker: native select in the chip row slot.** With no team
  selected, the Attacker panel slot shows a compact "My team ▾" `<select>`
  listing saved teams from `useTeams()`. This is also mobile's FIRST
  team-loading affordance (mobile currently has none).
- **Tap = full build.** A chip tap calls
  `actions.handleLoadConfig('p1', member.configuration)` — species, moves,
  item, ability, EVs, nature — not species-only. (Existing action; its
  missing-species guard already no-ops format-illegal members.)
- **Persistence: localStorage `calc.myTeamId` (team id only).** Members
  derive LIVE from `useTeams()` so team edits reflect immediately.
  Lifecycle is independent of battles: persists until ✕ or picking another
  team. Stored id of a deleted team → derives to no selection (picker shows); the stored id is deliberately left in place because teams load asynchronously and clearing during a transient empty list would wipe a valid selection.
- **Player-side scan mask: yes.** `ScanTeamModal` gains
  `myTeamIds?: number[] | null`; battle-mode PLAYER tiles resolve to the
  team's form-family set (same `formFamilyIds`, aliases included).
  Opponent-side masking unchanged. The two sides mask independently —
  either can be active without the other. Team-preview scans stay unmasked.
- **Shared chip row extracted.** One presentational `RosterChipRow`
  (label + tone, entries `{id, name}[]`, `activeId`, `onPick`, `onClear`)
  used by both sides; `OpponentRosterChips` becomes a thin wrapper with no
  behavior change. New `MyTeamChips` wraps it with the team select +
  member derivation.
- **Active ring** on the chip whose species id matches the current
  attacker (`state.p1.selectedId`).
- **Slot threading mirrors PR #22:** `attackerExtra?: React.ReactNode` on
  `ArenaCalculator` (→ the p1 `ArenaMonCard`'s existing `extra` slot) and
  on desktop `AttackerPanel` (same wrapper treatment `DefenderPanel` got).

## Components

1. **`myTeam.ts`** (scan feature or calc utils): `readMyTeamId()`,
   `saveMyTeamId(id)`, `clearMyTeamId()` — localStorage-backed, corrupt
   values cleared on read (same pattern as `battleRoster.ts`).
2. **`useMyTeam()`** (calculator page hook): joins the stored id against
   `useTeams().teams` → `{ teamId, team: TeamWithMembers | null,
   selectTeam(id), clearTeam() }`; a stored id with no matching team yields
   `team: null` (and the picker shows again).
3. **`RosterChipRow`** (shared presentational): extracted from
   `OpponentRosterChips`.
4. **`MyTeamChips`**: no team → "My team ▾" select; team → `RosterChipRow`
   with "You" label/accent tone, member chips, ✕ = `clearTeam`.
5. **Page wiring:** compose `myTeamChips` node once; `attackerExtra` to both
   layouts; `myTeamIds` (member species ids) to both `ScanTeamModal`s;
   extend the modal's resolver for the player side.

## Error handling & edge cases

- No team selected → attacker slot shows only the picker; scans behave as
  today on the player side.
- Team with <6 members → fewer chips (1..6 all valid).
- Member species not in the active format → chip renders with fallback
  name; tap no-ops via `handleLoadConfig`'s guard.
- Team deleted while selected → derive yields null → picker returns.
- No saved teams at all → the select renders with a disabled "No teams yet"
  option.

## Testing

- Unit: `myTeam` store (round-trip, corrupt value, clear); the modal
  resolver extension via `scanFrame`'s injectable deps — player tile masked
  to team family, opponent tile to roster family, both-active, one-active,
  neither-active identical to today.
- tsc + full suite; browser check both layouts (picker, chips, full-build
  load with ring, ✕, mask behavior on a battle scan).

## Out of scope

- Defender-side "my team" chips (opponent chips already own that panel).
- Multi-team management UI, team editing from the calc.
- Any change to opponent roster behavior.
