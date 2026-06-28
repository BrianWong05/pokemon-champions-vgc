# Champions Mega abilities vs `@smogon/calc`

Checked every **legal** Mega's ability against `@smogon/calc` gen-9 data (Spec 2 dataset slice).
`@smogon/calc` **silently ignores** an ability it doesn't know — it does not crash — so a Mega
with an unmodeled ability computes damage *as if it had no ability*. The six below are
Champions-original abilities not modelled by `@smogon/calc`; all six are on Megas that are
legal in Reg M-B, so they affect real calcs.

## Unmodeled abilities on legal Megas

| Ability | Mega | Damage-affecting? | Notes (verify against official sources) |
|---|---|---|---|
| Dragonize | Mega Feraligatr | **Yes** | Confirmed an `-ate`-type ability: in NCP's `damage_MASTER.js` it sits in the type-change list beside Galvanize. Converts Normal moves to Dragon (+~1.2×). |
| Eelevate | Mega Eelektross | Likely | Name follows the `-ate` pattern; probably retypes Normal moves (to Electric?) + boost. Verify. |
| Fire Mane | Mega Pyroar | Likely | Possibly a Fire `-ate`/boost. Verify. |
| Mega Sol | Mega Meganium | Unknown | Effect to verify — may set weather/terrain or a stat/type boost. |
| Piercing Drill | Mega Excadrill | Unknown | Effect to verify — possibly ignores Protect/abilities or boosts drill/contact moves. |
| Spicy Spray | Mega Scovillain | Unknown | Effect to verify — possibly a Fire/Grass-related boost. |

## Handling

Model each damage-affecting ability in `src/features/damage-calculator/utils/damage-calc.ts`:
- **`-ate` type-changers (Dragonize, Eelevate, Fire Mane):** extend `getModifiedMoveType`
  (which already handles pixilate/refrigerate/aerilate/galvanize) to retype Normal moves, and
  apply the ~1.2× power modifier where the other `-ate` boosts are applied.
- **Mega Sol / Piercing Drill / Spicy Spray:** confirm the exact in-game effect; model via
  `getModifiedMoveType` / `getStatModifier` / a base-power modifier as appropriate. If purely
  utility (no damage impact), document and skip.

## Status

Identified and documented (Spec 2 success criterion 5). Implementing these is a **follow-up**
out of scope for the dataset slice — until then, the six affected (legal) Megas compute damage
without their ability's effect (a bounded, known inaccuracy). Tracked as a separate task.

## Note on ability-less Mega rows

~14 other Champions Mega rows (e.g. the Mega-Z forms, Tatsugiri Megas, Mega Heatran/Darkrai)
exist as data with stats but **no ability and no legality in any regulation** — they are not
selectable, so their incomplete data is harmless. Left as-is intentionally.
