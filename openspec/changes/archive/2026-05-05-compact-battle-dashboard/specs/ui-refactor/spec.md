# Spec: UI Refactor for Compact Dashboard

## Overview
This specification details the transition from a spacious dashboard design to a high-density, compact layout suitable for vertical-space-constrained environments.

## Requirements
- The dashboard must not exceed 600px in height on desktop viewports.
- All 4 move slots must be visible simultaneously without scrolling the internal container.
- High-contrast visual hierarchy (STAB badges, primary percentages) must be preserved.

## Constraints
- Use only Vanilla CSS or Tailwind CSS utility classes.
- Do not remove any functional elements (KO text, triggered abilities, etc.).
- Maintain the dark-themed, glassmorphic aesthetic.
