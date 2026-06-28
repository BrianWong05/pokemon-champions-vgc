# Pokémon Champions damage calculator — Spec 2: Champions dataset (Mega + Reg M-B)

Date: 2026-06-29
Status: implemented (2026-06-29) — Reg M-B format + legality added (M-A set ∪ 38 additions; M-A 270, M-B 309). Champions Megas were already present in the DB with stats; abilities loaded for the 11 M-B-legal Megas that lacked them (NCP, MIT). Discovery during execution: Megas were pre-loaded (original Tasks 1–3 dropped), and 6 legal Megas use Champions-original abilities @smogon/calc doesn't model yet (documented in docs/champions-new-abilities.md, tracked as a follow-up).

Spec 2 from the program decomposition (see Part A of
`docs/superpowers/specs/2026-06-28-champions-calc-core-correctness-design.md`). With the
damage engine now correct (Spec 1), this slice completes the Champions **dataset** so both
current regulations have a full, correct, verified roster. **Data-only** — the
format-selector UI is a separate future slice.

---

## Current data state

- `vgc_pokemon.db` already holds **1204 `pokemon` rows**, including ~96 mainline Mega forms
  that carry their *own* Mega base stats and types (e.g. id 10033 *Mega Venusaur*,
  grass/poison, atk 100 / spa 122). Abilities (371), moves (937), and the
  `pokemon_abilities` / `pokemon_moves` join tables are well-populated.
- `pokemon_forms` has **96 `is_mega = 1`** rows (the mainline Megas).
- Only **"Regulation M-A"** exists as a format (270 legal mons via `format_pokemon`).
- **Gaps for Champions:**
  1. **Reg M-B** does not exist as a format, nor its `format_pokemon` legality.
  2. The **~25 Champions-original Megas** (≈9 introduced in Reg M-A, ≈16 in Reg M-B) on
     Gen 5/6/9 base species are absent — they never existed in mainline, so PokeAPI/Serebii
     mainline extraction didn't include them.
  3. M-A's legality is therefore missing its ~9 new Megas.
- **Pipeline:** Python scripts scrape/extract into the committed `vgc_pokemon.db`; Drizzle
  manages the schema. `scripts/scrape_regulation_m_a.py` scrapes Serebii
  (`serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml`), matches species/Megas to
  existing `pokemon` rows via the `{base}-mega` identifier convention, creates the format, and
  fills `format_pokemon`.

Because Spec 1 made `mapToSmogonPokemon` feed `@smogon/calc` our **base stats + types
directly**, a new Mega is a pure data problem: `@smogon/calc` does not need to know the
species. The one exception is abilities (passed by *name*) — see "Engine / ability check".

---

## Goal

Add the Champions-original Megas and the Reg M-B regulation to the dataset, verified against
official sources, so the calculator can compute correct damage for every legal Pokémon and
Mega in both Reg M-A and Reg M-B.

## Success criteria

1. Both **"Regulation M-A"** and **"Regulation M-B"** exist as formats, with `format_pokemon`
   legality matching the official Serebii lists (roster counts verified against the source).
2. The ~25 new Champions Megas exist as `pokemon` rows with correct Mega base stats, types,
   and ability, linked via `pokemon_forms` (`is_mega = 1`), and included in their
   regulation's legality (the ~9 new M-A Megas added to M-A; the ~16 new M-B Megas in M-B).
3. A **golden damage test** for at least one *new* Champions Mega matches ChampDex/NCP within
   rounding — proving the data + Spec-1 override path works for a species `@smogon/calc`
   doesn't know.
4. **DB sanity checks pass:** every `is_mega` row has six base stats and ≥1 ability; every
   `format_pokemon` row resolves to a real `pokemon`; both formats are present and non-empty.
5. Any new-Mega ability **not recognized by `@smogon/calc`** is identified and documented,
   with a handling note.

---

## Design (Approach A — curated JSON + loader, mirroring the existing pipeline)

### Data flow and files

1. **`scripts/data/champions_new_megas.json`** (new) — the hand-verified source of truth for
   the new Megas. Reviewable in PR diffs; values verified against Serebii / Bulbapedia /
   in-game Battle Data.
2. **`scripts/load_new_megas.py`** (new) — reads the JSON and inserts each Mega into
   `pokemon` (Mega base stats, types, `name_en`, `identifier` following the existing
   `{base}-mega` / `-mega-x` / `-mega-y` convention), `pokemon_forms` (`is_mega = 1`,
   `pokemon_id` → the new row, `form_identifier`), and `pokemon_abilities` (linking the
   ability). Idempotent: match on `identifier` and `INSERT OR IGNORE` / upsert so re-runs are
   safe.
3. **`scripts/scrape_regulation_m_b.py`** (new) — mirrors `scrape_regulation_m_a.py` against
   the parallel Serebii Reg M-B page; creates the **"Regulation M-B"** format and fills
   `format_pokemon` (reusing the M-A scraper's name/Mega matching logic, including the
   `-mega` convention).
4. **Re-run `scrape_regulation_m_a.py`** *after* the new Megas are loaded, so the ~9 new M-A
   Megas (now present as rows) get linked into M-A legality.
5. Output: the updated, committed `vgc_pokemon.db`. **No schema change is expected** — the
   existing tables model all of this. If one proves unavoidable, add a Drizzle migration under
   `drizzle/migrations`.

### New-Mega data contract (one JSON object per Mega)

| field | meaning |
|---|---|
| `baseSpecies` | the species it Mega-evolves from (for the `pokemon_id` link / identifier base) |
| `name` | display name, e.g. `"Mega <Species>"` (`name_en`) |
| `identifier` | `{base}-mega` (or `-mega-x` / `-mega-y`) |
| `type1`, `type2` | Mega typing (`type2` nullable) |
| `baseStats` | `{ hp, atk, def, spa, spd, spe }` — the Mega's base stats |
| `ability` | the Mega's ability (must exist in `abilities`, or be added) |
| `regulation` | `"M-A"` or `"M-B"` (drives which format's legality it joins) |

### Engine / ability check

`mapToSmogonPokemon` overrides base stats and types (Spec 1) but passes the **ability by
name** to `@smogon/calc`. A brand-new Champions-only ability would therefore not affect
damage. As part of this slice, cross-check each new Mega's ability against `@smogon/calc`'s
known ability set; for any unknown *damage-affecting* ability, document it (success
criterion 5) and note the handling (e.g. model it via the existing `getStatModifier` /
`getModifiedMoveType` hooks in `damage-calc.ts`, or flag it for a follow-up). Most Champions
Megas reuse existing abilities, so this is expected to be a short list.

### Verification

- **Golden tests** (`vitest`): a small set of Mega matchups — including at least one *new*
  Champions Mega and one returning mainline Mega — with damage % captured from ChampDex/NCP
  and asserted within rounding.
- **DB sanity checks** (a `vitest` test or a `scripts/verify_dataset.*` check): roster counts
  match the official Serebii lists; every `is_mega` row has six base stats and ≥1 ability;
  every `format_pokemon` row resolves to a real `pokemon`; both formats exist and are
  non-empty.

---

## Out of scope

- **Format-selector UI.** "Regulation M-A" is hardcoded in six sites (Damage Calculator,
  Teams, Speed Tiers, `pokemon.repo.ts`, `services/pokemon.ts`). Adding a selector and
  threading the chosen format is its own slice; until then the new M-B data is verified via
  tests/queries but not user-selectable in the UI.
- **Mega-Stone items.** Items live in `src/features/pokemon/utils/items.ts` (a TS list, not a
  DB table), and Megas are picked as their own form, so stones are not needed for damage.
- **Auditing the rest of M-A** beyond adding its ~9 new Megas (the existing 270-vs-official
  count is noted but not reconciled here).

## Risks / open questions

- **Serebii M-B page shape** may differ from M-A; the new scraper may need parsing tweaks.
- **Unknown abilities:** a damage-affecting Champions-only Mega ability not in `@smogon/calc`
  needs engine handling — surfaced by success criterion 5 rather than discovered late.
- **Accuracy:** exact rosters and Mega stat lines must be verified against official sources
  (the "verify" half of the hybrid sourcing decision); the JSON file is the reviewable record.
- **Licensing:** if any values are cross-referenced from the open-source NCP calc, confirm its
  license permits reuse; prefer Serebii/official as the committed source, NCP as a cross-check.
- **Maintenance:** every future regulation repeats this (new scrape + new-Mega entries); the
  JSON + scraper pattern keeps that cost bounded and reviewable.
