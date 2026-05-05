## Context

We recently integrated `@smogon/calc` and added the ability to select hold items. However, we have observed that when a Pokemon is given a type-resist berry (e.g. Chople Berry, which halves super-effective Fighting-type damage), the damage calculator output might not reflect the reduction.

## Goals / Non-Goals

**Goals:**
- Ensure that the damage calculations accurately reflect damage reduction from type-resist berries.
- Provide integration tests verifying these specific berry interactions.

**Non-Goals:**
- Do not implement custom math for berries if `@smogon/calc` natively handles them. Our goal is to ensure the library's feature is invoked and works in our app, fixing any wrapper misconfigurations if they exist.

## Decisions

- **Reliance on Engine**: `@smogon/calc` natively supports items like "Chople Berry". We simply need to ensure that the selected item string exactly matches the expected string in `@smogon/calc`'s item list, and that it is being passed correctly to the `Pokemon` constructor. The previous change (`add-hold-items`) already implemented passing the `item` property. We will verify its behavior with berries through automated tests.

## Risks / Trade-offs

- [Risk] There might be subtle bugs where `@smogon/calc` expects the berry name differently or doesn't apply it if other field/weather conditions interfere improperly. → **Mitigation**: Add specific unit tests for berry cases.