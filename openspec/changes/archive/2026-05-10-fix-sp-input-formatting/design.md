## Context
The current implementation of SP numeric input handlers does not prevent leading zeros from appearing when the input value is parsed.

## Goals / Non-Goals

**Goals:**
- Correct numeric input parsing to treat '01' as '1'.

**Non-Goals:**
- Changing other aspects of the StatGrid component.

## Decisions

- **Logic:** Use `parseInt(value, 10)` in the `onChange` handler to ensure numbers are stored and rendered without leading zeros.

## Risks / Trade-offs

- [Risk] Regression in input behavior → Mitigation: Verify input still accepts valid numbers and range constraints.
