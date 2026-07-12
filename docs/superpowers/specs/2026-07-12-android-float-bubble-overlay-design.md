# Android float-bubble overlay UX — design

**Date:** 2026-07-12
**Status:** Approved (brainstorm with Brian)

> **Amendment (2026-07-12, post-implementation):** in-battle scanning (on-field
> species classification + HP reads) was removed after on-device testing — not
> accurate enough. With a roster locked, the bubble now opens the calculator
> directly (no capture); the defender is picked from the docked strip or the
> roster chips, always at editable full HP. Team-preview scanning is unchanged.
> The `lastScanHp` store, battle scan-routing, and the "Scan active + HP"
> chrome button no longer exist.
**Design reference:** Claude Design project "Pokémon Champion Damage Calculator" (`6824e3f6-e49b-45fd-8833-c080661e7dd1`), file `FloatFlow.dc.html`. `FloatMenu`, `FloatOn`, `FloatFace` animation states, and the Arena-DS calculator restyle (`Landscape Calculator.dc.html` options 1a/1b/1c) are explicitly **out of scope** for this iteration.

## Problem

The Android floating bubble today captures a frame, yanks the app to the foreground, and opens the generic `ScanTeamModal`. The user wants to stay in the game: tap the bubble at team preview → scan → confirm the opponent roster in an overlay; tap the bubble in battle → the damage calculator pops up over the game with the scanned opponent + HP already applied.

## Scope

- **In:** the core FloatFlow UX — pre-battle scan → confirm-roster overlay → locked roster; in-battle calculator overlay with scan-applied defender + HP; docked roster strip over the game; restyled bubble with Scan/Calc tag.
- **Out:** FloatMenu quick-panel, FloatOn onboarding (current in-app enable toggle stays), FloatFace animated bubble faces, Arena-DS calculator visual restyle, iOS/web (all new behavior is gated behind `isAndroidNative()`; existing in-app scan flows — file picker, camera, `ScanTeamModal` — are untouched).

## Architecture

Three layers. Native captures and hosts windows; web owns all logic and UI.

### Native (extends `ScreenCapturePlugin` / `ScreenCaptureService`)

- **Bubble:** stays a native overlay view, restyled from the current `Button` to a circular face with a small "Scan"/"Calc" tag. Tag content is set by the web layer over the bridge.
- **Panel window:** one additional `TYPE_APPLICATION_OVERLAY` window hosting an Android `WebView` that loads the app bundle at the `#/overlay` route. The window has three states:
  - `hidden` — window removed/gone.
  - `strip` — window shrunk to a short docked bar at the bottom edge; the rest of the screen passes touches to the game.
  - `panel` — large surface for the confirm/calculator views (confirm ≈ 70% width anchored left; calculator near-fullscreen). Window is focusable in this state so text inputs work; system Back closes it.
- **Same-origin requirement:** the panel WebView must be served from the same origin as the main Capacitor WebView (`https://localhost`) so localStorage (battle roster, saved builds, scan-engine pref, `lastScanHp`) is shared for free. Implementation should reuse Capacitor's local-server/asset-serving machinery. **Fallback** if that proves fragile across Capacitor versions: sync the small state set through the native bridge instead; the spec's behavior does not change.
- Panel window lifecycle is owned by the service: torn down in the existing `teardown()` path so projection revocation removes bubble, strip, and panel together.

### Bridge (thin JS interface on the panel WebView)

- `captureFrame(): base64 PNG` — returns the frame native captured and stored at bubble-tap time.
- `blinkAndCapture(): base64 PNG` — hide panel → capture (~200 ms) → restore; for re-scans.
- `setWindowState('hidden' | 'strip' | 'panel')`.
- `setBubbleTag('scan' | 'calc')`.
- Event: bubble tap → notifies the overlay WebView; the web layer then pulls the stored frame via `captureFrame()`.

Nothing else crosses the bridge.

### Web (`#/overlay` route in the existing React app)

A lean overlay shell that renders one of: **ConfirmRoster**, **Calculator**, **Strip**, or **ScanError**. It reuses the existing scan pipeline (`scanFrame`, classifier, candidate logic, `buildLegalIdsResolver` masking) and the existing landscape calculator. Native never decides what to show.

## UX flow

**Single bubble behavior:** tap → native captures the frame *at tap time* (screen is unobstructed — the scan source is always clean) → panel opens → overlay route scans the frame → routes by detected mode:

1. **Team preview detected → ConfirmRoster view** (~70% width, left; the game's opponent column stays visible on the right as the scan source). Grid of 6 detected Pokemon with confidence badges; tap a card to fix it from top-3 candidates (existing candidate UI, amber flag for low confidence). Chrome bar: title, *Re-scan* (blink-capture), minimize. **Confirm & lock roster** → `saveBattleRoster` → window → `strip`, bubble tag → **Calc**.
2. **Battle detected → Calculator view** (near-fullscreen). The existing landscape calculator with a chrome bar: title, *Scan active + HP* re-scan button or "Read · N% HP" chip after a scan, minimize. Scan results are applied on open: defender = left-most detected on-field opponent with its HP%; both on-field mons' HP are stored in `lastScanHp`; roster chips inside the calculator switch defenders, applying stored HP. Battle scans are masked to the locked roster (existing behavior).
3. **Neither detected → ScanError card:** "Couldn't read the screen" + Retry (blink-capture) / Close.

**Strip state** (docked bar, panel closed, roster locked): the 6 locked opponent sprites, scanned-HP badges where known, active defender highlighted. Tap a mon → set as defender (with stored HP) for the next calculator open.

**Transitions:** minimize / tap-outside / Back → `strip` if a roster is locked, else `hidden`. Roster cleared (existing flows) → `hidden`, bubble tag → Scan. Confirmed roster is visible to the main app via shared storage next time it opens. The overlay re-reads roster state on every bubble tap, so changes made in the main app while the service is running self-correct at the next tap.

## Data & state

- **Roster:** existing `battleRoster` web storage remains the single source of truth. No new roster store.
- **`lastScanHp`:** new web-side store, `Map<pokemonId, hpPercent>`, persisted alongside the roster; written by each battle scan, read when loading a defender from strip/chips, cleared with the roster.
- **Native persists nothing** except window geometry; bubble tag and window state are pushed from web after confirm/clear.

## Error handling

- Unclassifiable frame → ScanError card (Retry / Close).
- Low-confidence identification → existing amber flag + candidate picker in ConfirmRoster.
- Projection revoked / service killed → existing teardown removes bubble + strip + panel; no orphaned windows.
- Overlay WebView render-process-gone → native destroys the window; recreated on next bubble tap.
- Battle scan matches nothing in the locked roster (stale roster) → ScanError card with a "Re-scan team preview next game" hint.

## Testing

- **Unit (vitest, existing patterns):** overlay routing (frame mode → view), `lastScanHp` merge/clear rules, strip pick → defender + HP application. Scan pipeline is already covered.
- **Manual on-device checklist** (the verification for native overlay windows, which can't be unit-tested):
  1. Enable capture, grant permissions.
  2. At team preview: tap bubble → confirm view opens with 6 detected; fix one low-confidence slot; confirm → strip appears, bubble shows Calc.
  3. In battle: tap bubble → calculator opens with defender + HP applied.
  4. Tap the other on-field mon in the roster chips → defender switches with its scanned HP.
  5. Minimize → strip; tap a strip mon → reopen calc → that mon is defender.
  6. Rotate device → capture and windows still correct.
  7. Revoke screen capture from the notification → bubble, strip, and panel all disappear.

## Decisions log

- Overlay surface: second WebView in an overlay window (chosen over Android Bubbles API and native Compose rebuild — full reuse of React scan/calc code, matches the design).
- Calculator UI: existing landscape calculator; Arena-DS restyle is a separate follow-up project.
- Pre-battle scan: immediate on tap (one tap); FloatFlow's intermediate "Scan team preview" panel dropped.
- Doubles: both on-field opponents scanned with HP; tap to switch defender.
- Docked roster strip: **in** v1 (user override of the initial strip-inside-panel proposal), implemented as the `strip` window state rather than a third window.
- Android-only; old tap→bring-app-to-front behavior is replaced by this flow.
