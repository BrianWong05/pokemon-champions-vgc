# Pokémon Champions damage calculator — Spec 5 (decomposition #4): Android overlay + one-tap capture

Date: 2026-07-05
Status: draft for review

Slice #4 of the program decomposition (see Part A of
`docs/superpowers/specs/2026-06-28-champions-calc-core-correctness-design.md`): the signature
**one-tap "capture → calculate"** flow on Android. While Champions is on screen, the user taps a
floating button; the app captures the screen, runs the existing scan pipeline (slice #5, already
merged), and comes to the foreground pre-filled.

This depends on Android `MediaProjection`. Whether that is even viable is unknown until a
**go/no-go spike** is run against the real game (Appendix A) — so the spike is Task 0 and the whole
design is structured so that a NO-GO outcome wastes as little work as possible.

---

## Goal & success criteria

**Goal:** on an Android device where the user is playing Champions, one tap on a floating button
captures the current screen and the calculator populates itself (opponent species + HP → the calc)
without leaving anything to manual entry that the scan can read.

**Success criteria (the GO path):**
1. From inside Champions, tapping the floating button captures a real (non-black) frame.
2. The app foregrounds with attacker/defender + scanned HP pre-filled via the **existing** scan path.
3. The HP `wrong === 0` invariant still holds (no regression to the slice-5 golden harness).
4. Capture is manual-tap-only, behind a feature flag, with a persistent notification + one-tap kill.
5. The web-side ingest layer is covered by CI tests that need no device.

**Success criteria (the NO-GO path):** the spike result is documented, the native source is not
built, and the shared seam + `FilePickerSource` refactor still ship and are ready for the
companion-camera source (slice #6).

---

## Context & constraints (from Part A)

- **Stack:** thin native plugin over the existing Capacitor Android shell (slice #3). No app-code
  rewrite — the plugin returns bytes; all scan logic stays in the web app.
- **No text-OCR for identity.** Identity comes from team-preview icon recognition; in-battle capture
  reads only non-text signals (HP %, etc.). Already true in slice #5; unchanged here.
- **Platform split.** Android same-device capture uses `MediaProjection` + a `SYSTEM_ALERT_WINDOW`
  overlay, consent **per session** (not per tap). iOS has no equivalent — that is companion mode
  (slice #6), out of scope here.
- **Positioning: deferred / ToS caution.** On-screen-data-only (no memory reads, no input
  automation), manual tap only, feature-flagged with a kill-switch. Live/continuous auto-calc is
  explicitly NOT built.
- **IP guardrails.** No "Pokémon" in name/icon; no bundled official assets; keep the web app as the
  un-removable fallback. Unchanged.

---

## Critical gate: the FLAG_SECURE spike (Task 0)

`MediaProjection` respects `FLAG_SECURE`: any window marked secure renders **black** in the
projected/virtual display. If Champions sets `FLAG_SECURE` on its team-preview and/or battle
screens, same-device capture returns black and **this entire same-device feature is dead** — the
program pivots to companion-camera (slice #6).

This is testable **today** with **no code** using the built-in Android screen recorder (which is
itself a `MediaProjection` client). The full runbook is Appendix A. Outcomes:

- **GO** (game content visible in a screen recording) → build `MediaProjectionSource` (Task 2).
- **NO-GO** (game content black in a screen recording) → stop; ship the shared seam only; pivot to
  slice #6.

No plugin code is written before this gate returns GO.

---

## Architecture — the `CaptureSource` seam

The capture flow splits into a **device-gated leaf** (native capture) and a **platform-agnostic
core** (ingest → scan → populate). The core is the bulk of the value and is buildable/testable now.

```
CaptureSource (interface)
  ├─ FilePickerSource      — refactor of today's file/photo scan (works now, no device)
  ├─ MediaProjectionSource — native Android plugin (Task 2, gated on spike GO + device)
  └─ CameraSource          — companion-camera (slice #6, interface-ready, NOT built here)
        │ capture(): Promise<CapturedFrame>
        ▼
ingestFrame(frame): platform-agnostic
  loadImage(frame) → RgbaImage → detectScanTargets → scanImage + HP
  → map to attacker/defender + scanned HP → populate the calc store
```

### `CaptureSource` interface
```ts
type CapturedFrame = {
  dataUrl: string            // 'data:image/png;base64,…' — a decodable full-screen grab
  width: number
  height: number
  sourceKind: 'file' | 'mediaProjection' | 'camera'
  capturedAt: number
}
interface CaptureSource {
  readonly kind: CapturedFrame['sourceKind']
  isAvailable(): Promise<boolean>     // e.g. plugin present + permissions granted
  capture(): Promise<CapturedFrame>   // rejects on cancel/denied/black-frame
}
```

### `ingestFrame` (shared ingest→populate layer)
A single function that takes a `CapturedFrame` and drives the **existing** slice-5 pipeline. It does
NOT re-implement any vision: it calls `detectScanTargets` (which already runs `inferGameRect` to
recover the 16:9 game frame from a framed capture — the same path that handles YouTube/photo
inputs), then `scanImage` + the HP reader, then maps results into the calc's attacker/defender
state with scanned HP. This is where all the testable logic lives.

### Sources
- **`FilePickerSource`** — extract today's file/photo scan entry (in `useTeamScan`/`PokemonImagePicker`)
  behind the interface. Pure refactor; zero behavior change; makes `ingestFrame` the single sink.
- **`MediaProjectionSource`** — wraps the native plugin's `capture()`; only builds on spike GO.
- **`CameraSource`** — slice #6; named here only to prove the seam generalizes. Not built.

---

## Consent, session & ToS safety

Android dictates the shape:

- **`SYSTEM_ALERT_WINDOW`** (draw the floating button over other apps): granted once via the system
  Settings screen (`Settings.ACTION_MANAGE_OVERLAY_PERMISSION`); check with `Settings.canDrawOverlays`.
- **`MediaProjection`**: a per-session system consent dialog
  (`MediaProjectionManager.createScreenCaptureIntent()`), held by a **foreground service**. On
  Android 14+ the service must declare type `mediaProjection` and hold `FOREGROUND_SERVICE` +
  `FOREGROUND_SERVICE_MEDIA_PROJECTION`; a persistent notification is mandatory.

**Session flow:**
1. In-app **"Enable one-tap capture"** toggle (feature-flagged).
2. First run: guide the user to grant overlay permission, then request MediaProjection consent.
3. Start the foreground service → it holds the projection and shows the floating button.
4. User switches to Champions, taps the button → **capture (no re-consent)** → app foregrounds,
   pre-filled.
5. **Stop:** the notification action or the in-app toggle tears down the service and hides the
   button — this is the kill-switch.

**ToS safety:** manual tap only, no continuous/automatic polling, on-screen-data-only; the mandatory
capture notification keeps it non-covert; the whole feature sits behind a flag defaulting off.

---

## Data flow (capture → populate)

1. **Native, on button tap:** the foreground service uses the held `MediaProjection` to create a
   `VirtualDisplay` backed by an `ImageReader` (screen size, `RGBA_8888`), acquires the latest image,
   copies it to a `Bitmap`, compresses to PNG, base64-encodes it, and resolves the pending
   `capture()` call with `{ dataUrl, width, height }`. Then it brings `MainActivity` to the front.
2. **JS:** `MediaProjectionSource.capture()` returns the `CapturedFrame` → `ingestFrame` →
   `loadImage(dataUrl)` → `RgbaImage` → existing `detectScanTargets` → `scanImage` + HP → populate.
3. **No new vision code:** the frame is the full device screen, but `detectScanTargets`/`inferGameRect`
   already recover the game rect from framed captures.

---

## Android specifics (native plugin)

A single Capacitor plugin, `ScreenCapturePlugin` (Kotlin), with the current Java `MainActivity`
left as-is:

- `@PluginMethod` surface: `hasOverlayPermission()`, `requestOverlayPermission()`,
  `startSession()` (launches the MediaProjection consent intent, starts the foreground service +
  overlay button; resolves once the session is live), `stopSession()`, `capture()` (grabs one frame),
  and a plugin event `overlayTap` fired when the floating button is pressed (JS listens and calls
  `capture()` + `ingestFrame`, or the plugin resolves `capture()` directly — see open questions).
- `MediaProjection.Callback` registered and released on stop; `VirtualDisplay`/`ImageReader` reused
  across captures within a session, released on stop.
- Manifest additions: `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_MEDIA_PROJECTION`, a `<service android:foregroundServiceType="mediaProjection">`.

---

## MVP scope

**In:** `CaptureSource` interface; `FilePickerSource` refactor; `ingestFrame` shared layer +
tests; `MediaProjectionSource`; the `ScreenCapturePlugin` (overlay button, foreground service,
capture); the enable/kill-switch toggle + feature flag; the FLAG_SECURE spike (Task 0).

**Out (deferred):** floating results overlay (chose app-to-front); continuous/auto capture;
`CameraSource`/companion mode (slice #6 — interface only); iOS/iPadOS; auto-fill-then-confirm UX
polish (slice #7); the CNN HP reader (parked).

---

## Task ordering & the companion-pivot

0. **FLAG_SECURE spike (gate)** — Appendix A. GO → continue. NO-GO → do Task 1 only, then pivot to
   slice #6.
1. **Shared seam** — `CaptureSource` + `CapturedFrame` + `ingestFrame` + `FilePickerSource` refactor
   + CI tests. **Device-independent; survives either spike outcome.**
2. **Native `MediaProjectionSource`** — the `ScreenCapturePlugin`, manifest/service, overlay button,
   consent/session, capture → `ingestFrame`. **Gated on spike GO + a physical device.**
3. **Feature-flag + toggle UI + kill-switch**, on-device manual verification.

If Task 0 is NO-GO, Tasks 2–3 are dropped and the same seam receives `CameraSource` in slice #6 —
no rework of Task 1.

---

## Testing strategy

- **Shared layer (CI, no device):** feed saved screenshots (`training/screenshots/`, HP fixtures)
  through `ingestFrame`, asserting the expected species + HP populate. Reuses the slice-5 corpus.
- **HP invariant:** the existing golden / `wrong === 0` harness continues to guard HP reads.
- **`FilePickerSource` refactor:** existing scan tests must stay green (behavior-preserving).
- **Native:** device-only (Android instrumented test or manual); the Appendix A runbook doubles as
  the manual capture test.

---

## Risks / open questions

- **Spike may be NO-GO.** Mitigated by the seam: only Task 1 is spike-independent, and it's most of
  the value. This is the whole reason for the architecture.
- **`overlayTap` vs `capture()` return path.** Two viable wirings: (a) the button-tap event bubbles
  to JS, which calls `capture()`; or (b) the plugin captures synchronously on tap and pushes the
  frame via one event. (a) keeps orchestration in JS (preferred); decide during Task 2.
- **Android 14+ foreground-service-type enforcement** and OEM overlay-permission quirks — verify on a
  real device during Task 2 (emulators can differ).
- **Emulator viability for the spike** — Champions mobile may resist emulators (Play Integrity /
  anti-emulation). A physical Android device with the game installed is the reliable spike target.
- **Bitmap size/perf** — a full-screen PNG is large; if base64 hand-off is slow, downscale to the
  game-rect region before encoding. Defer unless measured.

---

## Appendix A — FLAG_SECURE go/no-go spike runbook

**Purpose:** determine, before writing any plugin code, whether `MediaProjection` can capture
Champions' team-preview and battle screens, or whether they are `FLAG_SECURE` (black).

**Why the built-in screen recorder:** Android's built-in screen recorder and screen-mirroring/cast
are `MediaProjection` clients, so they obey `FLAG_SECURE` exactly like our future plugin would.
**Do NOT** use `adb shell screencap` or the hardware screenshot button as the test — those use a
privileged SurfaceFlinger path that can bypass `FLAG_SECURE` and give a **false GO**.

**Setup:**
1. A physical Android device (preferred) with the Champions mobile app installed and signed in.
   (Emulators may be blocked by Play Integrity / anti-emulation; use one only if Champions runs.)
2. Confirm the device has a built-in Screen Record tile (Quick Settings) — Android 11+.

**Procedure:**
1. Start a screen recording (Quick Settings → Screen Record; allow the MediaProjection prompt).
2. In Champions, open a **team-preview** screen; hold ~5 s.
3. Enter a **battle** screen (HP bars visible); hold ~5 s.
4. Stop the recording and play it back in the gallery.

**Interpret:**
- Game content **visible** in the recording on **both** screens → `FLAG_SECURE` NOT set → **GO**.
- Game content **black** (only system UI/overlays visible) on either screen → `FLAG_SECURE` set on
  that screen → **NO-GO** for same-device capture on that screen. If either target screen is black,
  treat the same-device hero as dead and pivot to companion-camera (slice #6).
- Record which screens are secure (some apps mark only battle, or only certain overlays).

**Secondary confirmation (optional):** cast/screen-mirror the device to another display; secure
content also blacks out there. Consistent with the recording result = high confidence.

**Record the result** in this spec (update Status) and in the planning files before proceeding.
