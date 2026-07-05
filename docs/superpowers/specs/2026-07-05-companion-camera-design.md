# Pokémon Champions damage calculator — Spec 7 (decomposition #6): Companion-camera mode

Date: 2026-07-05
Status: draft for review

Slice #6 of the program decomposition (see Part A of
`docs/superpowers/specs/2026-06-28-champions-calc-core-correctness-design.md`) — the **Apple/iPhone
hero**. iOS/iPadOS can't screenshot another app or float UI over a game, so the companion path is to
**point this device's camera at the other screen** (where the game is playing) and feed the camera
photo into the existing scan pipeline. Companion mode works on every platform.

**Scope (agreed with the user): the minimal path.** Add a `cameraSource` on the existing
`CaptureSource` seam (slice #4) that takes a single photo via Capacitor Camera and runs it through
the **unchanged** scan pipeline, which already recovers the 16:9 game frame from photos-with-margins.
No live preview, no perspective correction, no new vision — those are follow-ups if the simple path
proves insufficient.

---

## Goal & success criteria

**Goal:** on any platform, tap "Take photo", point the camera at a screen showing a Champions battle
or team-preview, and the scan populates the calc — the same result as importing a screenshot.

**Success criteria:**
1. A "Take photo" action in the Scan modal opens the device camera; the captured photo runs through
   the existing scan (`ingestFrame` → `detectScanTargets`/`inferGameRect` → species + HP).
2. On a reasonably straight-on, glare-free photo of a battle screen, the scan detects the opponents
   (best-effort — see caveat).
3. Cancelling the camera leaves the modal unchanged.
4. No regression to file-import scanning or any existing test.

---

## Context & constraints

- **Reuses the `CaptureSource` seam.** `CaptureSourceKind` already includes `'camera'` (a stub since
  slice #4). This slice provides the `cameraSource` implementation — a sibling of `filePickerSource`
  and `mediaProjectionSource`.
- **Capacitor Camera is already a dependency** (`@capacitor/camera`), and `capture.ts` already
  imports `Camera` / `CameraSource` / `CameraResultType` for the photo-picker. `takePhoto()` is the
  same call with `source: CameraSource.Camera`.
- **No new vision.** The photo flows through the unchanged pipeline. `inferGameRect`
  (`gameRect.ts`) was explicitly built to locate the 16:9 game frame inside "browser chrome, video
  frames, phone-photo margins" from magenta-plate color anchors, so a photo-with-margins is a
  supported input shape.
- **Platform behavior:** native (iOS/Android) opens the OS camera; web falls back to the browser's
  camera/file-capture input (Capacitor Camera's web impl). No custom camera UI.

---

## Architecture

- **`src/features/scan/capture.ts`** — add `takePhoto(): Promise<Blob | null>`, mirroring the
  existing `pickImage()` but `source: CameraSource.Camera`. On native it `fetch`es the returned
  `webPath` into a `Blob`; returns `null` if the user cancels.
- **`src/features/scan/captureSource.ts`** — add
  ```ts
  export const cameraSource: CaptureSource = {
    kind: 'camera',
    isAvailable: async () => true,
    async capture() {
      const blob = await takePhoto();
      return blob ? { blob, sourceKind: 'camera', capturedAt: Date.now() } : null;
    },
  };
  ```
  (identical shape to `filePickerSource`, swapping `pickImage` → `takePhoto`).
- **`src/features/scan/ScanTeamModal.tsx`** — next to the existing "choose image" trigger (which
  calls `startPick` → `filePickerSource.capture()`), add a **"Take photo"** action that calls
  `cameraSource.capture()` → the same `scan(frame.blob)` path (via a small `startCamera` handler
  mirroring `startPick`). Add a **one-line framing hint** ("Hold parallel to the screen; avoid
  glare").

That's the entire surface: one new util function, one new source, one new button + hint. The
captured photo is indistinguishable from an imported one downstream.

---

## UX

In the Scan modal's initial pick step:
```
   [ Choose image ]   [ Take photo ]
   Tip: hold the phone parallel to the screen and avoid glare.
```
Both routes end in the same scan + confirm UI. The "Take photo" button uses the existing button
style.

---

## Out of scope (follow-ups if the simple path scans poorly)

- Live `getUserMedia` preview with a 16:9 framing-guide overlay.
- Perspective/screen-quadrilateral detection + homography un-warp for angled shots.
- Glare/moiré mitigation; multi-frame capture; scan-pipeline tuning for camera photos (related to the
  deferred slice-4 landscape tuning).
- Any change to the scan/vision code.

---

## Testing

- **`captureSource.test.ts`** (extend existing) — `cameraSource.capture()` wraps a photo `Blob` into
  a `CapturedFrame` (`sourceKind: 'camera'`); returns `null` when `takePhoto` yields `null`. Mock
  `takePhoto` via `vi.mock('./capture')`, exactly like the `filePickerSource` tests.
- The downstream scan (`ingestFrame`/`detectScanTargets`/HP) is already covered by existing tests;
  this slice adds no vision code, so no new scan tests.
- Existing scan/modal tests stay green.

---

## Risks / open questions

- **Real-world accuracy is unproven.** A camera photo of a screen has perspective, glare, and moiré
  that clean screenshots don't. This MVP is the cheap way to measure whether the existing pipeline
  copes; degraded shots may scan poorly. The framing hint mitigates; the un-warp / live-preview
  options are the documented follow-ups. **This is the honest headline risk — the feature ships the
  path, not a guarantee of accuracy.**
- **Web camera behavior varies** by browser (permissions, front/back camera). Acceptable for the MVP;
  the primary target is native iOS/Android where `CameraSource.Camera` opens the rear camera.
- **Value for the primary user is niche** — an iPhone player who imports screenshots already has a
  working flow; companion-camera matters when you *can't* screenshot (watching another screen). This
  slice completes the Part-A program rather than serving a daily need.
