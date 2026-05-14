## Why
Currently, the SP/EV limit mode toggle is only available via a separate button. Users want a more intuitive way to toggle these limits by clicking the "Total SP Used" display area.

## What Changes
- Add an `onClick` handler to the "Total SP Used" display in `StatGrid.tsx` to toggle `isEvMode`.

## Capabilities

### New Capabilities
- `sp-ev-limit-toggle-interaction`: Enabling toggle functionality directly via the total SP/EV text display.

## Impact
- Improved UX for quick switching between SP and EV stat management modes.
