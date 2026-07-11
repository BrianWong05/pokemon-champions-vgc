# Mobile Chrome Safe-Area Fix

**Date:** 2026-07-11  
**Status:** approved for implementation

## Problem

The Arena shell does not consistently reserve iPhone safe areas. In landscape, the 56px navigation rail can sit under the notch. Enabling `viewport-fit=cover` exposes the correct landscape inset, but it also makes the existing portrait app bar render beneath the Dynamic Island because the app bar does not reserve the top inset.

The rail currently applies `env(safe-area-inset-left, 0px)` as padding, but two details prevent that from protecting the controls reliably:

- `index.html` does not opt into edge-to-edge safe-area values with `viewport-fit=cover`.
- The rail remains 56px wide, so under border-box sizing the inset consumes part of the control column instead of adding protected space beside it.
- The portrait app bar has a fixed 56px height and no `safe-area-inset-top` padding.
- The bottom tab bar applies bottom padding inside a fixed 64px height, shrinking its usable control area when the inset is non-zero.

## Design

Keep mobile chrome backgrounds full-bleed behind the device cutouts while placing interactive controls inside the safe area.

- Add `viewport-fit=cover` to the viewport meta tag so iOS reports the physical safe-area insets.
- Set the landscape rail width to `calc(56px + env(safe-area-inset-left, 0px))`.
- Keep the rail's left padding equal to `env(safe-area-inset-left, 0px)` so the original 56px control column begins after the unsafe region.
- Set the portrait app bar height to `calc(var(--appbar-h) + env(safe-area-inset-top, 0px))` and add top padding equal to the top inset, preserving a 56px control row below the Dynamic Island.
- Add the top inset to the portrait regulation menu's anchor calculation so it remains directly below its pill.
- Set the portrait tab bar height to `calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px))` while retaining its bottom-inset padding, preserving a 64px control row above the home-indicator area.
- Leave the desktop layout branch and calculator content unchanged. With zero insets, all chrome retains its existing dimensions.

The rail, app-bar, and tab-bar backgrounds intentionally extend under the unsafe regions so the app chrome remains visually continuous.

## Testing

- Add server-rendered markup regression tests for the rail, app bar, and tab bar declarations. SSR is required because jsdom 29.1.1 corrupts valid `env(..., fallback)` values when reading them through CSSOM.
- Add a document-level regression test asserting that the viewport meta tag includes `viewport-fit=cover`.
- Guard the regulation menu's safe-area-aware top anchor.
- Run the focused tests, full Vitest suite, type-check, and production build.
- In iOS Simulator, verify portrait controls sit below the Dynamic Island and above the home-indicator area, then verify landscape rail controls sit to the right of a left-side notch.

## Non-goals

- Insetting the calculator panels or the entire application shell.
- Redesigning the chrome or changing its 56px app-bar/rail and 64px tab-bar usable control dimensions.
