# Overlay my-team scan — bubble routes by screen type

**Date:** 2026-07-13
**Status:** approved
**Branch:** claude/android-bubble-team-scan-674ac2

## Problem

The Android floating bubble only scans the opponent's team (team-preview screen
→ battle roster). The user also wants to scan their **own** team from the
"Replicate This Battle Team?" screens (Moves & More / Stats) — the same
screens the Teams page's "Scan my team" (`PlayerScanModal`) already consumes —
and get the same result as importing a team: a saved Team.

User decisions (confirmed one by one):

- **Trigger:** the same bubble tap as the opponent scan; code distinguishes
  which screen was captured (the layouts are totally different). No new
  gesture, no second toggle.
- **Result:** save the Team only. Do NOT touch `calc.myTeamId` / the attacker
  side; the user picks the team later from the "My team ▾" chips.

## Design

### 1. Routing — one capture path, screen-type dispatch

In `OverlayApp.runScan`, after decoding the captured blob to an `RgbaImage`:

```
detectPlayerPanels(img) → non-null → player-team flow (kind self-detected: moves/stats)
                        → null     → existing scanFrame flow (team preview / battle), unchanged
```

- `detectPlayerPanels` (src/features/scan/playerPanels.ts) is pure pixel
  geometry — no model load — and strict: it requires 6 wide purple panels
  (aspect 2–6, width ≥ 22% of the frame) forming a validated 2×3 grid. A
  team-preview frame (one narrow column of 6 cards) cannot satisfy it, so
  player-detection-first ordering is safe.
- Every overlay capture path goes through this routing: bubble tap, the calc
  chrome's "Scan new team" button, and error-view Retry. With an opponent
  roster locked (bubble = calc shortcut), the user reaches the my-team scan
  via "Scan new team" while on the Replicate screen.
- The decoded `RgbaImage` is shared: decode once in `runScan`, pass to
  `detectPlayerPanels` for routing, and into whichever pipeline wins (the
  player pipeline re-detects panels internally via `scanPlayerImage`; that
  duplicate detect is cheap and keeps `usePlayerTeamScan` unchanged —
  `addFrame` takes a Blob).

### 2. Overlay player flow

New `playerScan` view in `OverlayApp`, backed by the **existing**
`usePlayerTeamScan` hook (accepts moves/stats frames in any order, merges,
self-detects kind, routes detection failures to the empty slot for
crop-retry).

Interaction:

1. Bubble tap on the Moves & More screen → panel opens (`setWindowState('panel')`)
   with the 6 parsed mons.
2. The panel's screen chips show which of the two screens are captured; the
   missing-screen hint already exists in `PlayerScanPanel`. The user flips to
   the Stats screen in-game (the game stays interactive around the overlay)
   and taps the capture button in the panel — which calls
   `overlayBridge.blinkAndCapture()` (same mechanism as Re-scan) and feeds
   `addFrame`. Order can be reversed; either screen alone saves with defaults
   (existing behavior).
3. Per-slot review/fix (species candidates, ability, item, moves, SP, nature —
   all existing `PlayerScanPanel` UI), then **Save team**.
4. Success state in the panel: "Team saved — find it in Teams", then close
   back to idle (`closePanel`, which self-corrects window state + bubble tag).

UI = reuse `PlayerScanPanel`, hosted in the overlay panel window inside a
scrollable card (precedent: the panel already hosts the full
`DamageCalculatorPage`). One seam change to `PlayerScanPanel`:

- New optional prop `sources?: CaptureSource[]` (default
  `[filePickerSource, cameraSource]`, preserving current Teams-page behavior).
  The overlay passes a single bridge-capture source of the existing kind
  `'mediaProjection'` (`capture: async () => frame-from-blinkAndCapture`), so
  the chip buttons render one "Scan this screen" action instead of
  file-picker/camera. Buttons derive from the prop; labels map from
  `CaptureSource.kind` inside `PlayerScanPanel` ('file' → "Add screenshot",
  'camera' → "Take photo", 'mediaProjection' → "Scan this screen") — no
  interface change to the `CaptureSource` seam.

No native (Java) changes. Bubble tag stays 'scan'/'calc' as today.

### 3. Data & saving

- **Teams write:** mount `useTeams()` in `OverlayApp`. Its existing
  restore-from-`localStorage['vgc_teams']` effect hydrates the overlay
  WebView's in-memory sql.js DB with the user's saved teams FIRST (critical:
  otherwise the persist effect would write a `vgc_teams` containing only the
  new team, clobbering existing ones). Then
  `createTeam("<first species>'s Team", members)` (same auto-name convention
  as the Teams page) inserts and the persist effect writes the full list back
  to localStorage. The main app picks it up on next reload — the same
  cross-WebView sync teams already rely on.
- **Vocab/moves:** `usePlayerTeamScan` loads its own vocab
  (`loadPlayerScanVocab`); `buildConfigs` additionally needs the `moves`
  table (`MoveData[]`). Add a small moves query alongside the overlay's
  existing `usePokemonList` (same `getDb()` the overlay already uses).
- `calc.myTeamId` is NOT set (user decision). Battle roster
  (`scan.battleRoster`) untouched.

### 4. Error handling

- Player screen detected but scan fails downstream → the hook's existing
  per-slot error state renders in `PlayerScanPanel` (with crop-retry).
- Neither player panels nor a team preview detected → existing overlay error
  view ("Couldn't read the screen"), unchanged copy for the empty/battle
  reasons.
- sql.js still loading when a tap lands: `runScan` already parks the blob in
  `pendingBlob` until `pokemonList` arrives; the routing happens after that
  gate, so the player path inherits the same protection.

## Risks / accepted trade-offs

- **Capture quality:** player-scan text matching was calibrated on clean
  Switch screenshots; phone screen-captures may read text/EV digits worse.
  Species candidates should hold; uncertain fields already render the amber
  low-confidence ring for one-tap correction. Accepted for v1 — no golden
  floor changes.
- **Concurrent-session clobber:** if the main app is open with a stale team
  list and its `useTeams` state later changes, its persist effect could write
  `vgc_teams` without the overlay-created team. Low likelihood (main app is
  backgrounded during play; its persist only fires on its own state changes).
  Accepted; no multi-tab sync in scope (pre-existing deferral from the
  battle-roster spec).
- **Duplicate panel detection** (route + `scanPlayerImage`) — negligible cost,
  keeps hook API unchanged.

## Testing

- **Routing unit test:** with injected deps, a frame where
  `detectPlayerPanels` returns non-null routes to the player flow; null routes
  to `scanFrame` (existing team/battle behavior asserted unchanged).
- **OverlayApp view test** (patterns from `OverlayApp.test.tsx`): bubble tap
  with a player-frame capture → `playerScan` view; Save → `createTeam` called
  with built configs; success state; close resets to idle.
- **PlayerScanPanel sources prop:** default renders file/camera buttons
  (Teams page unchanged); overlay source renders the single capture action and
  feeds `addFrame`.
- **Golden/accuracy suites:** untouched — zero scan-pipeline changes.
- **Manual verify:** in-browser `#/overlay` with the dev `__playerScanDebug`
  hook / synthetic-drop recipe against the golden player screenshots
  (`training/player-screens/`, symlink into the worktree). Emulator E2E
  optional since native code is untouched.
