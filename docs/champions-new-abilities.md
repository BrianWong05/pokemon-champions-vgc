# Champions Mega abilities vs `@smogon/calc`

Six **Champions-original** Mega abilities are not modelled by `@smogon/calc`. Because
`@smogon/calc` **silently ignores** an ability it doesn't know (it does not crash), a Mega with
one of these computes damage *as if it had no ability*. All six are on Megas legal in Reg M-B,
so they affect real calcs.

This file records each ability's **confirmed** in-game effect (cross-checked against
Serebii/Bulbapedia — see Sources) and how it is modelled in
`src/features/damage-calculator/utils/damage-calc.ts`.

> Note: the original draft of this file *guessed* that Eelevate and Fire Mane were `-ate`
> type-changers like Dragonize. Research disproved that — **only Dragonize is an `-ate`
> ability**. Eelevate is Levitate + Beast Boost; Fire Mane is an unconditional Fire boost. The
> table below reflects the confirmed effects.

## Confirmed effects and handling

| Ability | Mega | Confirmed effect | Damage-calc model |
|---|---|---|---|
| **Dragonize** | Mega Feraligatr | `-ate` type-changer: Normal-type moves become **Dragon**-type, power ×1.2. | Modelled. Normal moves retyped to Dragon + ~1.2× power (`4915/4096`). |
| **Eelevate** | Mega Eelektross | Levitate (immune to Ground moves except Thousand Arrows; ignores Spikes/Toxic Spikes/Sticky Web) **+** Beast Boost (highest non-HP stat +1 on KO). | Partly modelled. Ground immunity modelled by aliasing the ability to **Levitate** for the calc. Beast Boost (on-KO stat boost) is sequential, not part of a single damage calc — not modelled. |
| **Fire Mane** | Mega Pyroar | Fire-type moves power ×1.5, **always active** (unconditional Blaze). | Modelled. Fire moves ×1.5 power (`6144/4096`). |
| **Mega Sol** | Mega Meganium | The user's moves behave as if under harsh sunlight, regardless of field weather: Fire ×1.5, Water ×0.5, Weather Ball is Fire-type BP 100, Solar Beam/Blade skip charge & aren't weather-halved, Synthesis/Moonlight/Morning Sun heal ⅔, Thunder/Hurricane accuracy 50%, ignores Rock SpD/Def weather boosts. | Partly modelled: **Fire ×1.5, Water ×0.5**. Weather Ball is **not** modelled — `@smogon/calc` force-derives Weather Ball's type *and* power from the field weather (it has no per-Pokémon weather), so a move-level override can't survive; set Sun weather to approximate it. Charge-skip, healing, accuracy, and the Rock-SpD-ignore interactions are also out of scope for the calculator. |
| **Piercing Drill** | Mega Excadrill | Contact moves hit a **protecting** target, dealing ¼ of the move's damage (everything but the protect is still triggered). | **Not modelled (no impact).** The calculator has no Protect state, so this never changes a single damage calc. |
| **Spicy Spray** | Mega Scovillain | When hit by a damaging move, **burns the attacker** (even on faint / through Substitute by the attacker; not while Scovillain itself is behind a Substitute). | **Not modelled (no impact).** Inflicts a status *after* the hit; it never changes the incoming hit's damage, and the calculator has no attacker-status state. |

## Implementation notes

- **Offensive abilities (Dragonize, Fire Mane, Mega Sol):** `getModifiedMoveType` is extended for
  the only type change (Dragonize Normal→Dragon). `getChampionsMoveOverride` computes the
  `{ type, basePower }` move overrides (gated to these three abilities so `@smogon/calc`'s native
  `-ate` handling for pixilate/galvanize/etc. is untouched) and `mapToSmogonMove` applies them.
  The ~1.2× / ×1.5 / ×0.5 multipliers mirror `@smogon/calc`'s own modifier constants (`4915`,
  `6144`, `2048` over `4096`).
- **Eelevate (defensive):** `mapToSmogonPokemon` aliases the ability to `Levitate` for the calc,
  reusing `@smogon/calc`'s full Levitate handling (Ground immunity, the Thousand Arrows / Iron
  Ball / Gravity / Mold Breaker exceptions, and loss of grounded-terrain boosts).
- **Piercing Drill / Spicy Spray:** intentionally no-ops — documented above and covered by a test
  that asserts they don't change damage.

## Sources

- Dragonize / Mega Sol reveal — Serebii: https://x.com/SerebiiNet/status/2036444426906579390
- Eelevate — Bulbapedia: https://bulbapedia.bulbagarden.net/wiki/Eelevate_(Ability)
- Fire Mane — Bulbapedia: https://bulbapedia.bulbagarden.net/wiki/Fire_Mane_(Ability)
- Mega Sol — Bulbapedia: https://bulbapedia.bulbagarden.net/wiki/Mega_Sol_(Ability)
- Piercing Drill — Bulbapedia: https://bulbapedia.bulbagarden.net/wiki/Piercing_Drill_(Ability)
- Spicy Spray — Bulbapedia: https://bulbapedia.bulbagarden.net/wiki/Spicy_Spray_(Ability)

## Note on ability-less Mega rows

~14 other Champions Mega rows (e.g. the Mega-Z forms, Tatsugiri Megas, Mega Heatran/Darkrai)
exist as data with stats but **no ability and no legality in any regulation** — they are not
selectable, so their incomplete data is harmless. Left as-is intentionally.
