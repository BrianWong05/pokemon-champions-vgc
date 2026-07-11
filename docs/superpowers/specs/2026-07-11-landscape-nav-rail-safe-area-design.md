# Landscape Nav Rail Safe-Area Fix

**Date:** 2026-07-11  
**Status:** approved for implementation

## Problem

The Arena landscape shell places its 56px navigation rail against the left viewport edge. On an iPhone with a landscape notch, the rail's controls can overlap the unsafe region.

The rail currently applies `env(safe-area-inset-left, 0px)` as padding, but two details prevent that from protecting the controls reliably:

- `index.html` does not opt into edge-to-edge safe-area values with `viewport-fit=cover`.
- The rail remains 56px wide, so under border-box sizing the inset consumes part of the control column instead of adding protected space beside it.

## Design

Keep the navigation rail background full-bleed behind the notch, while placing every interactive rail control inside the safe area.

- Add `viewport-fit=cover` to the viewport meta tag so iOS reports the physical safe-area insets.
- Set the landscape rail width to `calc(56px + env(safe-area-inset-left, 0px))`.
- Keep the rail's left padding equal to `env(safe-area-inset-left, 0px)` so the original 56px control column begins after the unsafe region.
- Leave portrait and desktop layout branches unchanged. With a zero inset, the rail remains exactly 56px wide.

The rail background intentionally extends under the notch so it remains visually continuous with the app chrome.

## Testing

- Add a component regression test asserting that the rail includes the safe-area padding and additive width.
- Add a document-level regression test asserting that the viewport meta tag includes `viewport-fit=cover`.
- Run the focused tests, full Vitest suite, type-check, and production build.
- When an iOS landscape runtime is available, confirm that the icons, theme toggle, and regulation pill all sit to the right of the notch.

## Non-goals

- Changing portrait safe-area behavior.
- Insetting the calculator panels or the entire application shell.
- Redesigning the navigation rail or changing its 56px usable control width.
