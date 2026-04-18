## Context

The `StatSlider` currently increments by 1 (the default HTML range behavior). We need to explicitly set the `step` attribute to 4 to align with VGC standards.

## Goals / Non-Goals

**Goals:**
- Implement a 4-EV step for the `StatSlider`.
- Synchronize this behavior with the `StatInput` spinner.

## Decisions

- **Step Attribute**: Both `StatSlider` and `StatInput` will receive a `step={4}` attribute.
- **Constraints**: Minimum (0) and Maximum (252) remain unchanged.

## Risks / Trade-offs

- **[Risk]** Preventing odd-numbered EV spreads → **[Mitigation]** In competitive VGC, odd-numbered EV spreads are almost never optimal, so this constraint is actually a helpful guide for most users.
