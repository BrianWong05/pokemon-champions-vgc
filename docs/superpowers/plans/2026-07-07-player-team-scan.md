# Player Team Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scan two screenshots of the player's own team (moves/item screen + stats/SP screen) fully locally into a saved team with species, ability, item, moves, SP, and nature, in EN/JA/zh-Hant/zh-Hans with auto-detected language.

**Architecture:** A new sibling pipeline in `src/features/scan/`: purple-panel detection → existing sprite classifier for species → glyph-template digit reading (reusing the HP reader's helpers) for stats/SP + nature arrows → shape-matching of binarized text crops against canvas-rendered candidate names (candidate sets constrained by species learnset/abilities and the legal item list) → a pure merge step that cross-validates nature arrows against the invertible Champions stat formulas and builds `PokemonConfig[]` → a new `PlayerScanModal` on the Teams page that saves via `createTeam`.

**Tech Stack:** React + TypeScript, vitest (node env default), pngjs for test fixtures, `canvas` (new devDependency, node-side text rendering in tests), sql.js/drizzle (browser) + better-sqlite3 (node tests), Python scripts against PokeAPI CSVs for DB data, onnxruntime-web classifier (existing, reused).

**Spec:** `docs/superpowers/specs/2026-07-07-player-team-scan-design.md`

## Global Constraints

- All recognition is local. No network calls at scan time.
- Languages: `'en' | 'ja' | 'zh-Hant' | 'zh-Hans'`, auto-detected per scan (one language for both images).
- After any change to `vgc_pokemon.db`, sync the app copy: `cp vgc_pokemon.db public/vgc_pokemon.db` (tests read the root file, the app fetches the `public/` copy).
- Golden screenshot directories are **gitignored**; every test touching them starts with `it.skipIf(!fs.existsSync('<dir>'))`. Ground-truth JSON files in `training/` are committed.
- Vitest environment is `node` by default; DOM tests start with `// @vitest-environment jsdom` on line 1.
- npm installs in this repo use `--legacy-peer-deps`. Fresh worktrees need `npm install --legacy-peer-deps` before anything runs.
- UI style: scan modals use the `Modal` atom + raw Tailwind token classes (`bg-accent`, `text-ink-2`, `border-line-2`, `bg-inset`, `bg-raise`, `text-danger`); no Arena design-system components inside the modal (matches `ScanTeamModal`).
- Champions stat formulas (Lv50/IV31): `HP = base + 75 + sp`; other stats `floor((base + 20 + sp) × m)`, `m ∈ {0.9, 1.0, 1.1}`. Implemented in `src/features/pokemon/utils/champions-stats.ts` (`championsHP`, `championsStat`).
- SP values are 0–32 per stat. Neutral nature default is `'Serious'` (matches `toParsedSets`).
- Git commits: `git add` exact file paths only — never `git add -A`.
- Pixel-tuning constants are marked `// CALIBRATE` and tuned via the preview script + golden tests, the same loop used for the HP reader.

## Fixture prerequisite (user-provided, before Tasks 3–5, 7, 11 golden tests can run)

The four reference screenshots from the design discussion must be saved by the user (or copied from the main checkout) into the **gitignored** `training/player-screens/` with these exact names:

| File | Content |
|---|---|
| `en-rental-moves.png` | "Replicate This Battle Team?" — Moves & More tab (Grimmsnarl team) |
| `en-rental-stats.png` | "Replicate This Battle Team?" — Stats tab (Grimmsnarl team) |
| `zh-team17-moves.png` | 隊伍17 能力 tab (nicknamed team) |
| `zh-team17-stats.png` | 隊伍17 狀態 tab (nicknamed team) |

If they are JPG, convert exactly like the HP workflow: `sips -s format png <in.jpg> --out training/player-screens/<name>.png`. Golden tests skip when the directory is absent — tasks still complete via synthetic tests, but the calibration loops in Tasks 3, 4, 5, 7, 11 need the images to finish. **Ask the user for the images at the start of execution if `training/player-screens/` is missing.**

---

### Task 1: Golden ground truth + math-verification test

**Files:**
- Create: `training/player-golden.json`
- Create: `scripts/verify-player-golden.test.ts`
- Modify: `.gitignore` (add fixture dir)

**Interfaces:**
- Produces: `training/player-golden.json` — schema consumed by Tasks 3, 4, 5, 7, 11:

```jsonc
{
  "<pair-key>": {
    "movesImage": "<file in training/player-screens/>",
    "statsImage": "<file>",
    "lang": "en" | "ja" | "zh-Hant" | "zh-Hans",
    "team": [            // exactly 6, slot order (row-major on screen)
      {
        "species": "<nameEn>",
        "ability": "<English ability name>",
        "item": "<English item name>",
        "moves": ["<English move name>", ...],   // 1-4 entries
        "stats": [hp, atk, def, spa, spd, spe],  // final stats as displayed
        "sp":    [hp, atk, def, spa, spd, spe],
        "nature": "<bare nature name, e.g. Calm>"
      }, ...
    ]
  }
}
```

- [ ] **Step 1: Add fixture dir to .gitignore**

Append to `.gitignore`:

```
# player team scan golden screenshots (local only)
training/player-screens/
```

- [ ] **Step 2: Write the golden file with the verified EN team and a zh placeholder**

Create `training/player-golden.json`. The EN values below were transcribed from the reference screenshots and every row verified against the Champions formulas (the test in Step 3 re-verifies mechanically):

```json
{
  "en-rental": {
    "movesImage": "en-rental-moves.png",
    "statsImage": "en-rental-stats.png",
    "lang": "en",
    "team": [
      { "species": "Grimmsnarl", "ability": "Prankster", "item": "Light Clay",
        "moves": ["Foul Play", "Parting Shot", "Reflect", "Light Screen"],
        "stats": [202, 126, 105, 115, 119, 80], "sp": [32, 0, 20, 0, 14, 0], "nature": "Calm" },
      { "species": "Swampert", "ability": "Damp", "item": "Swampertite",
        "moves": ["Wave Crash", "Earthquake", "Ice Punch", "Protect"],
        "stats": [193, 176, 110, 94, 110, 98], "sp": [18, 30, 0, 0, 0, 18], "nature": "Adamant" },
      { "species": "Pelipper", "ability": "Drizzle", "item": "Sitrus Berry",
        "moves": ["Hurricane", "Weather Ball", "Tailwind", "Wide Guard"],
        "stats": [167, 63, 121, 132, 107, 96], "sp": [32, 0, 1, 5, 17, 11], "nature": "Modest" },
      { "species": "Archaludon", "ability": "Stamina", "item": "Leftovers",
        "moves": ["Electro Shot", "Dragon Pulse", "Flash Cannon", "Protect"],
        "stats": [197, 112, 150, 160, 114, 109], "sp": [32, 0, 0, 1, 29, 4], "nature": "Modest" },
      { "species": "Sinistcha", "ability": "Hospitality", "item": "Coba Berry",
        "moves": ["Matcha Gotcha", "Rage Powder", "Trick Room", "Protect"],
        "stats": [178, 80, 143, 141, 130, 81], "sp": [32, 0, 4, 0, 30, 0], "nature": "Relaxed" },
      { "species": "Metagross", "ability": "Clear Body", "item": "Metagrossite",
        "moves": ["Iron Head", "Psychic Fangs", "Body Press", "Protect"],
        "stats": [169, 182, 150, 103, 110, 126], "sp": [14, 27, 0, 0, 0, 25], "nature": "Jolly" }
    ]
  }
}
```

Do NOT add the zh entry yet — Step 5 does it with image access.

- [ ] **Step 3: Write the failing math-verification test**

`scripts/verify-player-golden.test.ts` — pure JSON + DB, no images, never skipped. It proves every golden entry is self-consistent (species exists, ability belongs to species, moves in learnset, stats = formula(base, sp, nature)):

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { championsHP, championsStat } from '../src/features/pokemon/utils/champions-stats';
import { getNatureStats } from '../src/features/pokemon/utils/pokemon-natures';

interface GoldenSlot {
  species: string; ability: string; item: string; moves: string[];
  stats: number[]; sp: number[]; nature: string;
}
interface GoldenPair { movesImage: string; statsImage: string; lang: string; team: GoldenSlot[] }

const golden: Record<string, GoldenPair> = JSON.parse(fs.readFileSync('training/player-golden.json', 'utf8'));
const db = new Database('vgc_pokemon.db', { readonly: true });

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

describe('player-golden.json is self-consistent', () => {
  for (const [key, pair] of Object.entries(golden)) {
    describe(key, () => {
      pair.team.forEach((slot, i) => {
        it(`slot ${i + 1}: ${slot.species}`, () => {
          const p = db.prepare(
            'SELECT id, base_hp, base_attack, base_defense, base_sp_atk, base_sp_def, base_speed FROM pokemon WHERE name_en = ?'
          ).get(slot.species) as any;
          expect(p, `species ${slot.species} in DB`).toBeTruthy();

          const abilityRows = db.prepare(
            `SELECT a.name_en FROM abilities a JOIN pokemon_abilities pa ON pa.ability_id = a.id WHERE pa.pokemon_id = ?`
          ).all(p.id) as any[];
          expect(abilityRows.map(r => r.name_en)).toContain(slot.ability);

          for (const move of slot.moves) {
            const m = db.prepare(
              `SELECT m.id FROM moves m JOIN pokemon_moves pm ON pm.move_id = m.id WHERE pm.pokemon_id = ? AND m.name_en = ?`
            ).get(p.id, move);
            expect(m, `${slot.species} learns ${move}`).toBeTruthy();
          }

          const bases = [p.base_hp, p.base_attack, p.base_defense, p.base_sp_atk, p.base_sp_def, p.base_speed];
          const { boostedStat, hinderedStat } = getNatureStats(slot.nature);
          expect(slot.stats[0]).toBe(championsHP(bases[0], slot.sp[0]));
          for (let s = 1; s < 6; s++) {
            const mult = STAT_KEYS[s] === boostedStat ? 1.1 : STAT_KEYS[s] === hinderedStat ? 0.9 : 1.0;
            expect(slot.stats[s], `${STAT_KEYS[s]}`).toBe(championsStat(bases[s], slot.sp[s], mult));
          }
          for (const sp of slot.sp) { expect(sp).toBeGreaterThanOrEqual(0); expect(sp).toBeLessThanOrEqual(32); }
        });
      });
    });
  }
});
```

Note: `getNatureStats` returns lowercase keys like `'atk'`/`'spa'` (`src/features/pokemon/utils/pokemon-natures.ts:52`) — that's why `STAT_KEYS` is lowercase.

- [ ] **Step 4: Run the test**

Run: `npx vitest run scripts/verify-player-golden.test.ts`
Expected: PASS (6 slots × en-rental). If any assertion fails, the golden transcription is wrong — fix `player-golden.json`, not the test. (One known trap: `pokemon_moves` may not contain event/transfer moves; if a legitimately displayed move is missing from the learnset table, relax that single assertion to a `console.warn` and note it in the JSON with a `"_note"` key.)

- [ ] **Step 5: Transcribe the zh pair (needs images)**

If `training/player-screens/zh-team17-moves.png` and `zh-team17-stats.png` exist: open both with the Read tool (they are images), transcribe the 6 slots into a `"zh-team17"` entry in `player-golden.json` (`"lang": "zh-Hant"`). Species are identified by sprite, not nickname (the nicknames 靈魂板凳 etc. are NOT species names). All values go into the JSON in **English** (species/ability/item/move names) — translate via the DB (`name_zh` columns). Re-run the Step 4 test; the stat-math assertions will catch any transcription error. If the images are absent, skip and leave a `"_todo": "zh-team17 pending screenshots"` marker key — Task 11 revisits.

- [ ] **Step 6: Commit**

```bash
git add training/player-golden.json scripts/verify-player-golden.test.ts .gitignore
git commit -m "test(scan): player-team golden ground truth with stat-math verification"
```

---

### Task 2: DB — zh-Hans names + items table (data + schema + sync)

**Files:**
- Modify: `scripts/populate_moves.py`, `scripts/populate_abilities.py`
- Create: `scripts/populate_items.py`
- Modify: `src/db/schema.ts` (add `nameZhHans` columns, `items` table, `pokemonMoves` table if absent)
- Modify: `src/features/pokemon/utils/items.ts` (export `MEGA_STONES`)
- Create: `src/db/schema-items.test.ts`
- Both DB copies: `vgc_pokemon.db`, `public/vgc_pokemon.db`

**Interfaces:**
- Consumes: PokeAPI CSVs (`https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/`), language ids: en=9, ja-Hrkt=1, ja=11, zh-Hant=4, zh-Hans=12.
- Produces: `moves.name_zh_hans`, `abilities.name_zh_hans` columns; `items` table `(id INTEGER PK, identifier TEXT, name_en TEXT, name_ja TEXT, name_zh TEXT, name_zh_hans TEXT)`; drizzle defs `items`, `pokemonMoves` in `src/db/schema.ts`; exported `MEGA_STONES: Set<string>` from `items.ts`. Tasks 6+ rely on these exact column/table names.

- [ ] **Step 1: Write the failing schema/data test**

`src/db/schema-items.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';

const db = new Database('vgc_pokemon.db', { readonly: true });

describe('localized scan data', () => {
  it('moves have zh-Hans names', () => {
    const row = db.prepare("SELECT name_zh_hans FROM moves WHERE name_en = 'Pound'").get() as any;
    expect(row?.name_zh_hans).toBe('拍击');
  });
  it('abilities have zh-Hans names', () => {
    const row = db.prepare("SELECT name_zh_hans FROM abilities WHERE name_en = 'Prankster'").get() as any;
    expect(row?.name_zh_hans).toBe('恶作剧之心');
  });
  it('items table exists with localized names', () => {
    const row = db.prepare("SELECT name_ja, name_zh, name_zh_hans FROM items WHERE name_en = 'Leftovers'").get() as any;
    expect(row?.name_zh).toBe('吃剩的東西');
    expect(row?.name_zh_hans).toBe('吃剩的东西');
    expect(row?.name_ja).toBeTruthy();
  });
  it('Champions mega stones are present with synthesized zh names', () => {
    const row = db.prepare("SELECT name_zh FROM items WHERE name_en = 'Dragoninite'").get() as any;
    expect(row?.name_zh).toBe('快龍進化石');
  });
  it('public copy is in sync', () => {
    const pub = new Database('public/vgc_pokemon.db', { readonly: true });
    const a = db.prepare('SELECT COUNT(*) AS c FROM items').get() as any;
    const b = pub.prepare('SELECT COUNT(*) AS c FROM items').get() as any;
    expect(a.c).toBe(b.c);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/db/schema-items.test.ts`
Expected: FAIL — `no such column: name_zh_hans` / `no such table: items`.

- [ ] **Step 3: Extend the Python populate scripts**

In `scripts/populate_moves.py` and `scripts/populate_abilities.py`, extend the existing name-merge (which filters `local_language_id == 4` for zh) with a zh-Hans merge (`== 12`) into a new `name_zh_hans` column, and make each script self-migrating with:

```python
cur.execute("PRAGMA table_info(moves)")  # or abilities
cols = [r[1] for r in cur.fetchall()]
if "name_zh_hans" not in cols:
    cur.execute("ALTER TABLE moves ADD COLUMN name_zh_hans TEXT")
```

then include `name_zh_hans` in the existing `INSERT OR REPLACE` column list (follow each script's existing merge pattern exactly — they already do this dance for `name_zh`).

Create `scripts/populate_items.py` (same style as `populate_abilities.py`):

```python
import sqlite3
import pandas as pd

BASE_URL = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"
db_path = "vgc_pokemon.db"

items = pd.read_csv(BASE_URL + "items.csv")
names = pd.read_csv(BASE_URL + "item_names.csv")

def lang(df, lid, col):
    d = df[df.local_language_id == lid][["item_id", "name"]].rename(columns={"name": col})
    return d

merged = items[["id", "identifier"]]
for lid, col in [(9, "name_en"), (1, "name_ja"), (4, "name_zh"), (12, "name_zh_hans")]:
    merged = merged.merge(lang(names, lid, col), left_on="id", right_on="item_id", how="left").drop(columns=["item_id"])
# ja fallback: some items only have language 11
ja11 = lang(names, 11, "name_ja11")
merged = merged.merge(ja11, left_on="id", right_on="item_id", how="left").drop(columns=["item_id"])
merged["name_ja"] = merged["name_ja"].fillna(merged["name_ja11"])
merged = merged.drop(columns=["name_ja11"])

conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("""CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY, identifier TEXT NOT NULL, name_en TEXT,
    name_ja TEXT, name_zh TEXT, name_zh_hans TEXT)""")

for _, r in merged.iterrows():
    cur.execute("INSERT OR REPLACE INTO items VALUES (?,?,?,?,?,?)",
                (int(r.id), r.identifier, r.name_en, r.name_ja, r.name_zh, r.name_zh_hans))

# Champions-only mega stones: not in PokeAPI. Synthesize zh names as "<species zh>進化石"
# (official Champions naming, e.g. 快龍進化石) by longest-common-prefix species match.
MEGA_STONES = [  # keep in sync with src/features/pokemon/utils/items.ts MEGA_STONES
    "Abomasite","Absolite","Aerodactylite","Aggronite","Alakazite","Altarianite","Ampharosite",
    "Audinite","Banettite","Beedrillite","Blastoisinite","Cameruptite","Chandelurite",
    "Charizardite X","Charizardite Y","Chesnaughtite","Chimechite","Clefablite","Crabominite",
    "Delphoxite","Dragoninite","Drampanite","Emboarite","Excadrite","Feraligite","Floettite",
    "Froslassite","Galladite","Garchompite","Gardevoirite","Gengarite","Glalitite","Glimmoranite",
    "Golurkite","Greninjite","Gyaradosite","Hawluchanite","Heracronite","Houndoominite",
    "Kangaskhanite","Lopunnite","Lucarionite","Manectite","Medichamite","Meganiumite",
    "Meowsticite","Pidgeotite","Pinsirite","Sablenite","Scizorite","Scovillainite","Sharpedonite",
    "Skarmorite","Slowbronite","Starminite","Steelixite","Tyranitarite","Venusaurite","Victreebelite",
]
MANUAL_SPECIES = {"Dragoninite": "Dragonite", "Chimechite": "Chimecho"}  # extend if prefix match misfires

pokemon = pd.read_sql("SELECT name_en, name_ja, name_zh FROM pokemon WHERE name_en IS NOT NULL", conn)
existing = {r[0] for r in cur.execute("SELECT name_en FROM items").fetchall()}
next_id = 100000

def species_for(stone):
    base = stone.replace(" X", "").replace(" Y", "")
    if stone in MANUAL_SPECIES: return MANUAL_SPECIES[stone]
    best, best_len = None, 0
    for name in pokemon.name_en:
        n = 0
        while n < min(len(name), len(base)) and name[n].lower() == base[n].lower():
            n += 1
        if n > best_len: best, best_len = name, n
    return best if best_len >= 4 else None

for stone in MEGA_STONES:
    if stone in existing: continue  # classic stones came from PokeAPI
    sp = species_for(stone)
    row = pokemon[pokemon.name_en == sp].iloc[0] if sp is not None and (pokemon.name_en == sp).any() else None
    suffix = " X" if stone.endswith(" X") else (" Y" if stone.endswith(" Y") else "")
    zh = (str(row.name_zh) + "進化石" + suffix) if row is not None and pd.notna(row.name_zh) else None
    zh_hans = None  # zh-Hant name is char-convertible if needed later; matching falls back to en
    cur.execute("INSERT OR REPLACE INTO items VALUES (?,?,?,?,?,?)",
                (next_id, stone.lower().replace(" ", "-"), stone, None, zh, zh_hans))
    next_id += 1

conn.commit()
conn.close()
print(f"items: {cur.rowcount if cur.rowcount != -1 else 'ok'}")
```

Adjust the manual-overrides dict after eyeballing the printed mismatches; the Champions naming for the visible stones must come out as 快龍進化石 (Dragoninite) — the Step 1 test pins it.

- [ ] **Step 4: Run scripts and sync**

```bash
python3 scripts/populate_moves.py
python3 scripts/populate_abilities.py
python3 scripts/populate_items.py
cp vgc_pokemon.db public/vgc_pokemon.db
```

(Needs network for the PokeAPI CSVs. Requires `pandas`; same env the existing scripts use.)

- [ ] **Step 5: Update drizzle schema**

In `src/db/schema.ts`: add `nameZhHans: text('name_zh_hans')` to the `moves` and `abilities` table definitions (next to the existing `nameZh` lines), and add (only if not already present — check first):

```ts
export const items = sqliteTable('items', {
  id: integer('id').primaryKey(),
  identifier: text('identifier').notNull(),
  nameEn: text('name_en'),
  nameJa: text('name_ja'),
  nameZh: text('name_zh'),
  nameZhHans: text('name_zh_hans'),
});

export const pokemonMoves = sqliteTable('pokemon_moves', {
  pokemonId: integer('pokemon_id').notNull(),
  moveId: integer('move_id').notNull(),
});
```

Match the file's existing import/naming style (`sqliteTable`, `integer`, `text` are already imported there). DDL for these lives in the Python scripts, which is the established pattern for data tables (`extract_pokeapi_data.py` creates `pokemon`/`types` the same way); do not touch `drizzle/migrations/`.

- [ ] **Step 6: Export MEGA_STONES**

In `src/features/pokemon/utils/items.ts` change `const MEGA_STONES = new Set([...])` to `export const MEGA_STONES = new Set([...])`. Nothing else in the file changes.

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/db/schema-items.test.ts scripts/verify-player-golden.test.ts`
Expected: PASS (both — golden verification now also covers Swampertite/Metagrossite present as items is irrelevant to it, but it must not regress).

- [ ] **Step 8: Commit**

```bash
git add scripts/populate_moves.py scripts/populate_abilities.py scripts/populate_items.py \
  src/db/schema.ts src/features/pokemon/utils/items.ts src/db/schema-items.test.ts \
  vgc_pokemon.db public/vgc_pokemon.db
git commit -m "feat(db): zh-Hans names for moves/abilities + localized items table"
```

---

### Task 3: Panel detection — `playerPanels.ts`

**Files:**
- Create: `src/features/scan/playerTypes.ts`
- Create: `src/features/scan/playerPanels.ts`
- Create: `src/features/scan/playerPanels.test.ts`
- Create: `scripts/preview-player-crops.ts`

**Interfaces:**
- Consumes: `RgbaImage`, `TileBox` from `./types`; `rgbToHsv`, `connectedComponents` from `./segmentation`.
- Produces (Tasks 4, 5, 7 rely on these exact shapes):

```ts
// playerTypes.ts
import type { TileBox } from './types';

export type PlayerScreenKind = 'moves' | 'stats';
export type ScanLang = 'en' | 'ja' | 'zh-Hant' | 'zh-Hans';

export interface StatCellRegions { label: TileBox; stat: TileBox; sp: TileBox }

export interface PanelRegions {
  panel: TileBox;
  sprite: TileBox;
  /** moves screen only */
  abilityText?: TileBox;
  itemText?: TileBox;
  moveTexts?: TileBox[];           // length 4, top to bottom
  /** stats screen only — canonical order [hp, atk, def, spa, spd, spe] */
  statCells?: StatCellRegions[];
}

export interface PlayerFrameDetection {
  kind: PlayerScreenKind;
  panels: PanelRegions[];          // length 6, slot order (row-major)
}
```

- `detectPlayerPanels(img: RgbaImage): PlayerFrameDetection | null` — null when fewer than 6 panels found (caller offers crop-and-retry).
- Exported for tests/preview: `isPanelPurplePixel(r,g,b): boolean`, `classifyScreenKind(img, panels: TileBox[]): PlayerScreenKind`, `carveRegions(panel: TileBox, kind: PlayerScreenKind): PanelRegions`, plus the region-fraction constant tables `MOVES_FRAC` and `STATS_FRAC`.

- [ ] **Step 1: Write failing synthetic tests**

`src/features/scan/playerPanels.test.ts` (follow `segmentation.test.ts`'s `blank`/`fillRect` helpers — copy those two small helpers into this file):

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import type { RgbaImage } from './types';
import { detectPlayerPanels, classifyScreenKind, carveRegions } from './playerPanels';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const i = (yy * img.width + xx) * 4;
    img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
  }
}

const PURPLE: [number, number, number] = [168, 156, 224];  // panel body tone
const ORANGE: [number, number, number] = [240, 150, 50];   // stat bar tone

function paintSixPanels(img: RgbaImage) {
  // 2 cols x 3 rows on a 1280x720 canvas, panel 480x120
  const boxes = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const x = 100 + c * 560, y = 150 + r * 170;
    fillRect(img, x, y, 480, 120, PURPLE);
    boxes.push({ x, y, w: 480, h: 120 });
  }
  return boxes;
}

describe('detectPlayerPanels', () => {
  it('finds 6 panels in slot order', () => {
    const img = blank(1280, 720);
    paintSixPanels(img);
    const det = detectPlayerPanels(img);
    expect(det).not.toBeNull();
    expect(det!.panels).toHaveLength(6);
    // slot order: row-major — slot 0 top-left, slot 1 top-right, slot 2 mid-left...
    expect(det!.panels[0].panel.x).toBeLessThan(det!.panels[1].panel.x);
    expect(det!.panels[0].panel.y).toBeCloseTo(det!.panels[1].panel.y, -1);
    expect(det!.panels[2].panel.y).toBeGreaterThan(det!.panels[0].panel.y);
  });

  it('returns null when fewer than 6 panels', () => {
    const img = blank(1280, 720);
    fillRect(img, 100, 150, 480, 120, PURPLE);
    expect(detectPlayerPanels(img)).toBeNull();
  });

  it('classifies stats screen by orange bars', () => {
    const img = blank(1280, 720);
    const boxes = paintSixPanels(img);
    for (const b of boxes) fillRect(img, b.x + 200, b.y + 50, 60, 6, ORANGE);
    expect(classifyScreenKind(img, boxes)).toBe('stats');
  });

  it('classifies moves screen when no bars', () => {
    const img = blank(1280, 720);
    const boxes = paintSixPanels(img);
    expect(classifyScreenKind(img, boxes)).toBe('moves');
  });

  it('carves 4 move rows and 6 stat cells', () => {
    const panel = { x: 0, y: 0, w: 480, h: 120 };
    expect(carveRegions(panel, 'moves').moveTexts).toHaveLength(4);
    expect(carveRegions(panel, 'stats').statCells).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/scan/playerPanels.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `playerTypes.ts` and `playerPanels.ts`**

`playerTypes.ts` exactly as in Interfaces above. `playerPanels.ts`:

```ts
import type { RgbaImage, TileBox } from './types';
import { rgbToHsv, connectedComponents } from './segmentation';
import type { PanelRegions, PlayerFrameDetection, PlayerScreenKind, StatCellRegions } from './playerTypes';

// CALIBRATE: purple panel body of the team-detail screens (both layouts)
export function isPanelPurplePixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  return h >= 230 && h <= 280 && s >= 0.12 && s <= 0.6 && v >= 0.45;
}

// CALIBRATE: orange stat bars (stats screen only)
function isBarPixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  return h >= 15 && h <= 45 && s >= 0.5 && v >= 0.55;
}

export function classifyScreenKind(img: RgbaImage, panels: TileBox[]): PlayerScreenKind {
  let statsVotes = 0;
  for (const p of panels) {
    let bar = 0;
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
      const i = (y * img.width + x) * 4;
      if (isBarPixel(img.data[i], img.data[i + 1], img.data[i + 2])) bar++;
    }
    if (bar >= p.w * p.h * 0.002) statsVotes++; // CALIBRATE
  }
  return statsVotes >= 3 ? 'stats' : 'moves';
}

// Region tables as fractions [x, y, w, h] of the panel box. CALIBRATE with
// scripts/preview-player-crops.ts against the golden screenshots.
export const MOVES_FRAC = {
  sprite: [0.012, 0.02, 0.085, 0.42],
  ability: [0.055, 0.34, 0.42, 0.30],
  itemText: [0.115, 0.65, 0.40, 0.30],
  moveText: (i: number) => [0.60, 0.03 + i * 0.24, 0.37, 0.21] as const,
} as const;

export const STATS_FRAC = {
  sprite: [0.012, 0.02, 0.085, 0.42],
  // per stat cell [col, row]: label (incl. arrow), stat digits, sp digits
  cell: (col: number, row: number) => ({
    label: [0.04 + col * 0.48, 0.30 + row * 0.235, 0.155, 0.20],
    stat:  [0.195 + col * 0.48, 0.30 + row * 0.235, 0.105, 0.20],
    sp:    [0.385 + col * 0.48, 0.30 + row * 0.235, 0.075, 0.20],
  }),
} as const;

function frac(panel: TileBox, f: readonly [number, number, number, number]): TileBox {
  return {
    x: Math.round(panel.x + panel.w * f[0]),
    y: Math.round(panel.y + panel.h * f[1]),
    w: Math.round(panel.w * f[2]),
    h: Math.round(panel.h * f[3]),
  };
}

export function carveRegions(panel: TileBox, kind: PlayerScreenKind): PanelRegions {
  if (kind === 'moves') {
    return {
      panel,
      sprite: frac(panel, MOVES_FRAC.sprite),
      abilityText: frac(panel, MOVES_FRAC.ability),
      itemText: frac(panel, MOVES_FRAC.itemText),
      moveTexts: [0, 1, 2, 3].map(i => frac(panel, MOVES_FRAC.moveText(i))),
    };
  }
  // canonical order [hp, atk, def, spa, spd, spe] = left column top→bottom, then right column
  const cells: StatCellRegions[] = [];
  for (const [col, rows] of [[0, [0, 1, 2]], [1, [0, 1, 2]]] as const) {
    for (const row of rows) {
      const c = STATS_FRAC.cell(col, row);
      cells.push({ label: frac(panel, c.label), stat: frac(panel, c.stat), sp: frac(panel, c.sp) });
    }
  }
  return { panel, sprite: frac(panel, STATS_FRAC.sprite), statCells: cells };
}

export function detectPlayerPanels(img: RgbaImage): PlayerFrameDetection | null {
  const mask = new Uint8Array(img.width * img.height);
  for (let i = 0, px = 0; i < img.data.length; i += 4, px++) {
    if (img.data[i + 3] > 0 && isPanelPurplePixel(img.data[i], img.data[i + 1], img.data[i + 2])) mask[px] = 1;
  }
  const minArea = Math.max(2000, Math.round(img.width * img.height * 0.008)); // CALIBRATE
  let boxes = connectedComponents(mask, img.width, img.height, minArea)
    .filter(b => b.w / b.h > 2 && b.w / b.h < 6 && b.w >= img.width * 0.22);
  if (boxes.length < 6) return null;
  boxes = boxes.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 6);

  const byCy = boxes
    .map(b => ({ b, cy: b.y + b.h / 2, cx: b.x + b.w / 2 }))
    .sort((p, q) => p.cy - q.cy);
  const ordered: TileBox[] = [];
  for (let r = 0; r < 3; r++) {
    ordered.push(...byCy.slice(r * 2, r * 2 + 2).sort((p, q) => p.cx - q.cx).map(p => p.b));
  }
  const kind = classifyScreenKind(img, ordered);
  return { kind, panels: ordered.map(box => carveRegions(box, kind)) };
}
```

- [ ] **Step 4: Run synthetic tests**

Run: `npx vitest run src/features/scan/playerPanels.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the preview script and calibrate against goldens**

`scripts/preview-player-crops.ts` (mirrors `scripts/preview-crops.ts`; uses `loadPng` from `scripts/hp-accuracy-core.ts`):

```ts
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { loadPng } from './hp-accuracy-core';
import { detectPlayerPanels } from '../src/features/scan/playerPanels';
import { cropImage } from '../src/features/scan/segmentation';
import type { RgbaImage } from '../src/features/scan/types';

const file = process.argv[2];
if (!file) { console.error('usage: npx tsx scripts/preview-player-crops.ts training/player-screens/<file>.png'); process.exit(1); }

const outDir = 'training/.player-crop-preview';
fs.mkdirSync(outDir, { recursive: true });

function save(img: RgbaImage, name: string) {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data);
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}

const img = loadPng(file);
const det = detectPlayerPanels(img);
if (!det) { console.error('no panels detected'); process.exit(1); }
console.log(`kind=${det.kind}`);
det.panels.forEach((p, i) => {
  save(cropImage(img, p.panel), `slot${i + 1}-panel.png`);
  save(cropImage(img, p.sprite), `slot${i + 1}-sprite.png`);
  if (p.abilityText) save(cropImage(img, p.abilityText), `slot${i + 1}-ability.png`);
  if (p.itemText) save(cropImage(img, p.itemText), `slot${i + 1}-item.png`);
  p.moveTexts?.forEach((m, j) => save(cropImage(img, m), `slot${i + 1}-move${j + 1}.png`));
  p.statCells?.forEach((c, j) => {
    save(cropImage(img, c.label), `slot${i + 1}-cell${j}-label.png`);
    save(cropImage(img, c.stat), `slot${i + 1}-cell${j}-stat.png`);
    save(cropImage(img, c.sp), `slot${i + 1}-cell${j}-sp.png`);
  });
});
console.log(`wrote crops to ${outDir}`);
```

Add `training/.player-crop-preview/` to `.gitignore`. Run it on all four goldens (`npx tsx scripts/preview-player-crops.ts training/player-screens/en-rental-stats.png`, etc.), **view the emitted crops with the Read tool**, and adjust `isPanelPurplePixel`, `MOVES_FRAC`, `STATS_FRAC` until: every sprite crop contains the whole sprite; every text crop contains its full text with no neighbor bleed; every stat/sp crop contains the full number. Both layouts (rental + own-team) must pass with the same constants — the panels are identical; only screen chrome differs.

Then add the golden detection test to `playerPanels.test.ts`:

```ts
const GOLDEN_DIR = 'training/player-screens';
describe.skipIf(!fs.existsSync(GOLDEN_DIR))('golden screenshots', () => {
  const cases: Array<[string, 'moves' | 'stats']> = [
    ['en-rental-moves.png', 'moves'], ['en-rental-stats.png', 'stats'],
    ['zh-team17-moves.png', 'moves'], ['zh-team17-stats.png', 'stats'],
  ];
  for (const [file, kind] of cases) {
    it(`detects 6 ${kind} panels in ${file}`, async () => {
      const { loadPng } = await import('../../../scripts/hp-accuracy-core');
      const det = detectPlayerPanels(loadPng(`${GOLDEN_DIR}/${file}`));
      expect(det?.kind).toBe(kind);
      expect(det?.panels).toHaveLength(6);
    }, 60_000);
  }
});
```

Run: `npx vitest run src/features/scan/playerPanels.test.ts`
Expected: PASS (golden cases skip if images absent — but do not consider calibration done until they run and pass).

- [ ] **Step 6: Commit**

```bash
git add src/features/scan/playerTypes.ts src/features/scan/playerPanels.ts \
  src/features/scan/playerPanels.test.ts scripts/preview-player-crops.ts .gitignore
git commit -m "feat(scan): player team-detail panel detection + region carving"
```

---

### Task 4: Stat digits + nature arrows — `statDigits.ts`

**Files:**
- Create: `src/features/scan/statDigits.ts`
- Create: `src/features/scan/statDigits.test.ts`

**Interfaces:**
- Consumes: `whiteMask`, `segmentGlyphs`, `filterSpecks`, `normalizeGlyph`, `charDistances`, `GlyphCosts` from `./hpText`; `HP_GLYPH_TEMPLATES` from `./hpGlyphTemplates`; `rgbToHsv` from `./segmentation`; `StatCellRegions` from `./playerTypes`.
- Produces (Task 7 relies on):

```ts
export type NatureArrow = 'up' | 'down' | null;
export interface StatRowRead { stat: number | null; sp: number | null; arrow: NatureArrow }
export function readStatCell(img: RgbaImage, cell: StatCellRegions): StatRowRead;
export function readIntegerIn(img: RgbaImage, box: TileBox, maxValue: number): number | null;
export function detectArrow(img: RgbaImage, labelBox: TileBox): NatureArrow;
```

- [ ] **Step 1: Write failing unit tests**

`src/features/scan/statDigits.test.ts`. Synthetic arrow tests + (golden-guarded) full stats-screen read against `player-golden.json`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import type { RgbaImage } from './types';
import { detectArrow, readStatCell } from './statDigits';
import { detectPlayerPanels } from './playerPanels';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const i = (yy * img.width + xx) * 4;
    img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
  }
}

describe('detectArrow', () => {
  it('red cluster on the right of the label = up', () => {
    const img = blank(100, 20);
    fillRect(img, 80, 5, 10, 10, [230, 60, 60]);
    expect(detectArrow(img, { x: 0, y: 0, w: 100, h: 20 })).toBe('up');
  });
  it('blue cluster = down', () => {
    const img = blank(100, 20);
    fillRect(img, 80, 5, 10, 10, [70, 110, 235]);
    expect(detectArrow(img, { x: 0, y: 0, w: 100, h: 20 })).toBe('down');
  });
  it('no saturated cluster = null', () => {
    const img = blank(100, 20);
    fillRect(img, 10, 5, 60, 10, [245, 245, 245]); // white label text
    expect(detectArrow(img, { x: 0, y: 0, w: 100, h: 20 })).toBe(null);
  });
});

const GOLDEN_DIR = 'training/player-screens';
describe.skipIf(!fs.existsSync(GOLDEN_DIR))('golden stats reads', () => {
  const golden = JSON.parse(fs.readFileSync('training/player-golden.json', 'utf8'));
  for (const [key, pair] of Object.entries<any>(golden)) {
    if (key.startsWith('_') || !pair.statsImage) continue;
    it(`${key}: all 36 stat and 36 sp values exact`, async () => {
      const { loadPng } = await import('../../../scripts/hp-accuracy-core');
      const det = detectPlayerPanels(loadPng(`${GOLDEN_DIR}/${pair.statsImage}`));
      expect(det?.kind).toBe('stats');
      det!.panels.forEach((panel, slot) => {
        const reads = panel.statCells!.map(c => readStatCell(loadPng(`${GOLDEN_DIR}/${pair.statsImage}`), c));
        expect(reads.map(r => r.stat)).toEqual(pair.team[slot].stats);
        expect(reads.map(r => r.sp)).toEqual(pair.team[slot].sp);
      });
    }, 300_000);
  }
});
```

(Refactor note for the implementer: load the PNG once per `it`, not per cell — the structure above shows the assertions; hoist `const img = loadPng(...)`.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/scan/statDigits.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/features/scan/statDigits.ts`:

```ts
import type { RgbaImage, TileBox } from './types';
import {
  whiteMask, segmentGlyphs, filterSpecks, normalizeGlyph, charDistances, type GlyphCosts,
} from './hpText';
import { HP_GLYPH_TEMPLATES } from './hpGlyphTemplates';
import { rgbToHsv } from './segmentation';
import type { StatCellRegions } from './playerTypes';

export type NatureArrow = 'up' | 'down' | null;
export interface StatRowRead { stat: number | null; sp: number | null; arrow: NatureArrow }

const DIGIT_TEMPLATES = HP_GLYPH_TEMPLATES.filter(t => t.char >= '0' && t.char <= '9');
const MAX_MEAN_COST = 0.1; // mirror hpText MAX_DIST: prefer blank over a guess

function decodeInteger(glyphs: GlyphCosts[], maxValue: number): number | null {
  const options = glyphs.map(g =>
    [...g.dists.entries()].filter(([c]) => c >= '0' && c <= '9').sort((a, b) => a[1] - b[1]).slice(0, 2));
  if (!options.length || options.some(o => o.length === 0)) return null;
  let best: { value: number; cost: number } | null = null;
  for (let pick = 0; pick < 1 << options.length; pick++) {
    let text = '', cost = 0;
    for (let i = 0; i < options.length; i++) {
      const opt = options[i][(pick >> i) & 1];
      if (!opt) { text = ''; break; }
      text += opt[0]; cost += opt[1];
    }
    if (!text || (text.length > 1 && text.startsWith('0'))) continue;
    const value = Number(text);
    if (value > maxValue) continue;
    const mean = cost / options.length;
    if (mean > MAX_MEAN_COST) continue;
    if (!best || mean < best.cost) best = { value, cost: mean };
  }
  return best ? best.value : null;
}

export function readIntegerIn(img: RgbaImage, box: TileBox, maxValue: number): number | null {
  const mask = whiteMask(img, box);
  const boxes = filterSpecks(segmentGlyphs(mask), mask.h);
  if (!boxes.length || boxes.length > String(maxValue).length) return null;
  const glyphs: GlyphCosts[] = boxes
    .sort((a, b) => a.x - b.x)
    .map(b => ({ box: b, dists: charDistances(normalizeGlyph(mask, b), b.h / mask.h, b, DIGIT_TEMPLATES) }));
  return decodeInteger(glyphs, maxValue);
}

export function detectArrow(img: RgbaImage, labelBox: TileBox): NatureArrow {
  // arrows sit at the right end of the label; scan the right 45% to skip the stat icon/text
  const x0 = labelBox.x + Math.floor(labelBox.w * 0.55);
  let red = 0, blue = 0;
  for (let y = labelBox.y; y < labelBox.y + labelBox.h; y++) {
    for (let x = x0; x < labelBox.x + labelBox.w; x++) {
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] === 0) continue;
      const [h, s, v] = rgbToHsv(img.data[i], img.data[i + 1], img.data[i + 2]);
      if (s < 0.4 || v < 0.35) continue;
      if (h <= 25 || h >= 335) red++;
      else if (h >= 195 && h <= 260) blue++;
    }
  }
  const min = Math.max(6, Math.round(labelBox.w * labelBox.h * 0.008)); // CALIBRATE
  if (red >= min && red > blue * 2) return 'up';
  if (blue >= min && blue > red * 2) return 'down';
  return null;
}

export function readStatCell(img: RgbaImage, cell: StatCellRegions): StatRowRead {
  return {
    stat: readIntegerIn(img, cell.stat, 999),
    sp: readIntegerIn(img, cell.sp, 32),
    arrow: detectArrow(img, cell.label),
  };
}
```

- [ ] **Step 4: Run synthetic tests, then golden tests**

Run: `npx vitest run src/features/scan/statDigits.test.ts`
Expected: synthetic PASS immediately. Golden reads likely need iteration:
- If digits misread or return null, first re-check region crops via `npx tsx scripts/preview-player-crops.ts ...` (Task 3 constants), then inspect whether `HP_GLYPH_TEMPLATES` digits match this font size.
- **Contingency (only if HP templates provably fail):** build stat-digit templates from the goldens themselves, following `scripts/build-hp-glyph-templates.ts`'s per-screenshot mode: for each `sp`/`stat` crop with known text from `player-golden.json`, run the same `whiteMask → segmentGlyphs → normalizeGlyph` pipeline and emit `src/features/scan/statGlyphTemplates.ts` (`export const STAT_GLYPH_TEMPLATES: Array<{char: string; bits: string; hFrac: number}> = [...]`, generated-file header comment like `hpGlyphTemplates.ts`). Then have `DIGIT_TEMPLATES` prefer `STAT_GLYPH_TEMPLATES` and fall back to HP digits. Write the builder as `scripts/build-stat-glyph-templates.ts` reusing `glyphTemplatesFromPanel`-style logic against golden crops, and commit both files.

Expected end state: all golden stat/sp assertions pass exactly (zero wrong reads — the design's merge step depends on it).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/statDigits.ts src/features/scan/statDigits.test.ts
git commit -m "feat(scan): stat/SP digit reading + nature arrow detection"
```

(If the contingency ran: also add `scripts/build-stat-glyph-templates.ts src/features/scan/statGlyphTemplates.ts`.)

---

### Task 5: Text shape matching — `textMatch.ts`

**Files:**
- Create: `src/features/scan/textMatch.ts`
- Create: `src/features/scan/textMatch.test.ts`
- Modify: `package.json` (devDependency `canvas`)

**Interfaces:**
- Consumes: `whiteMask`, `BinMask` from `./hpText`; `RgbaImage`, `TileBox` from `./types`.
- Produces (Tasks 6–8 rely on):

```ts
export interface TextShape { cols: number[]; grid: number[]; aspect: number }
export type TextRenderer = (text: string) => BinMask;
export interface TextCandidate { key: string; label: string }
export interface TextMatchResult { key: string; score: number }  // score = 1 - distance, higher better

export function textShapeAt(img: RgbaImage, box: TileBox): TextShape | null; // null = blank region
export function shapeFromMask(mask: BinMask): TextShape | null;
export function shapeDistance(a: TextShape, b: TextShape): number;
export function matchTextShape(shape: TextShape, candidates: TextCandidate[], render: TextRenderer, topN?: number): TextMatchResult[];
export function makeTextRenderer(createCanvas: (w: number, h: number) => any): TextRenderer;
export const browserTextRenderer: TextRenderer; // makeTextRenderer over document.createElement('canvas')
```

- [ ] **Step 1: Install node canvas**

Run: `npm install --legacy-peer-deps -D canvas`
Expected: installs prebuilt binaries on macOS arm64 without error.

- [ ] **Step 2: Write failing tests**

`src/features/scan/textMatch.test.ts` — self-render round-trip (render a name, match it against a candidate set containing it plus decoys — must win) across all four languages, node renderer from the `canvas` package:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createCanvas } from 'canvas';
import { makeTextRenderer, matchTextShape, shapeFromMask } from './textMatch';

const render = makeTextRenderer((w, h) => createCanvas(w, h));

function bestKey(target: string, decoys: string[]): string | null {
  const shape = shapeFromMask(render(target));
  if (!shape) return null;
  const candidates = [target, ...decoys].map(label => ({ key: label, label }));
  return matchTextShape(shape, candidates, render)[0]?.key ?? null;
}

describe('textMatch self-render round trip', () => {
  it('en move names', () => {
    expect(bestKey('Protect', ['Parting Shot', 'Reflect', 'Light Screen', 'Foul Play'])).toBe('Protect');
    expect(bestKey('Light Screen', ['Light Clay', 'Reflect', 'Protect'])).toBe('Light Screen');
  });
  it('zh-Hant move names', () => {
    expect(bestKey('守住', ['拍落', '順風', '擊掌奇襲'])).toBe('守住');
    expect(bestKey('十萬伏特', ['流星群', '打草結', '急速折返'])).toBe('十萬伏特');
  });
  it('zh-Hans names', () => {
    expect(bestKey('拍击', ['空手劈', '连环巴掌', '百万吨重拳'])).toBe('拍击');
  });
  it('ja names', () => {
    expect(bestKey('まもる', ['はたきおとす', 'おいかぜ', 'ふいうち'])).toBe('まもる');
  });
  it('blank mask yields null shape', () => {
    expect(shapeFromMask({ bits: new Uint8Array(100), w: 10, h: 10 })).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/features/scan/textMatch.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

`src/features/scan/textMatch.ts`:

```ts
import type { RgbaImage, TileBox } from './types';
import { whiteMask, type BinMask } from './hpText';

export interface TextShape { cols: number[]; grid: number[]; aspect: number }
export type TextRenderer = (text: string) => BinMask;
export interface TextCandidate { key: string; label: string }
export interface TextMatchResult { key: string; score: number }

const COLS = 48, GRID_W = 16, GRID_H = 6;
const MIN_INK = 12; // fewer lit pixels than this = blank region

function inkBounds(mask: BinMask): TileBox | null {
  let minX = mask.w, minY = mask.h, maxX = -1, maxY = -1, ink = 0;
  for (let y = 0; y < mask.h; y++) for (let x = 0; x < mask.w; x++) {
    if (!mask.bits[y * mask.w + x]) continue;
    ink++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (ink < MIN_INK || maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function shapeFromMask(mask: BinMask): TextShape | null {
  const b = inkBounds(mask);
  if (!b || b.h < 4 || b.w < 4) return null;
  const cols = new Array(COLS).fill(0);
  const grid = new Array(GRID_W * GRID_H).fill(0);
  const colCount = new Array(COLS).fill(0);
  const gridCount = new Array(GRID_W * GRID_H).fill(0);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const lit = mask.bits[(b.y + y) * mask.w + (b.x + x)] ? 1 : 0;
    const c = Math.min(COLS - 1, Math.floor((x / b.w) * COLS));
    cols[c] += lit; colCount[c]++;
    const g = Math.min(GRID_H - 1, Math.floor((y / b.h) * GRID_H)) * GRID_W +
              Math.min(GRID_W - 1, Math.floor((x / b.w) * GRID_W));
    grid[g] += lit; gridCount[g]++;
  }
  return {
    cols: cols.map((v, i) => (colCount[i] ? v / colCount[i] : 0)),
    grid: grid.map((v, i) => (gridCount[i] ? v / gridCount[i] : 0)),
    aspect: b.w / b.h,
  };
}

function meanAbs(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

export function shapeDistance(a: TextShape, b: TextShape): number {
  return 0.45 * meanAbs(a.cols, b.cols)
       + 0.35 * meanAbs(a.grid, b.grid)
       + 0.20 * Math.min(1, Math.abs(a.aspect - b.aspect) / 6);
}

export function textShapeAt(img: RgbaImage, box: TileBox): TextShape | null {
  return shapeFromMask(whiteMask(img, box, 0.72)); // CALIBRATE threshold
}

const FONT = '600 32px system-ui, sans-serif'; // both renderers use the same spec

export function makeTextRenderer(createCanvas: (w: number, h: number) => any): TextRenderer {
  const cache = new Map<string, BinMask>();
  return (text: string) => {
    const hit = cache.get(text);
    if (hit) return hit;
    const measure = createCanvas(10, 10).getContext('2d');
    measure.font = FONT;
    const w = Math.max(8, Math.ceil(measure.measureText(text).width) + 8);
    const h = 48;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.font = FONT; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 4, h / 2);
    const data = ctx.getImageData(0, 0, w, h).data;
    const bits = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) bits[p] = data[i] > 128 ? 1 : 0;
    const mask = { bits, w, h };
    cache.set(text, mask);
    return mask;
  };
}

export const browserTextRenderer: TextRenderer =
  makeTextRenderer((w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }));

export function matchTextShape(
  shape: TextShape, candidates: TextCandidate[], render: TextRenderer, topN = 3,
): TextMatchResult[] {
  const scored: TextMatchResult[] = [];
  for (const c of candidates) {
    const cs = shapeFromMask(render(c.label));
    if (!cs) continue;
    scored.push({ key: c.key, score: 1 - shapeDistance(shape, cs) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/features/scan/textMatch.test.ts`
Expected: PASS. If a CJK round-trip fails, the node canvas fell back to a tofu font — verify with `render('守住')` ink count > 0; on macOS system CJK fonts resolve via fontconfig, so a failure means the font string needs an explicit family list (append `, 'PingFang TC', 'Hiragino Sans'`).

- [ ] **Step 6: Golden crop test (game font vs rendered font — the risk gate)**

Append to `textMatch.test.ts`:

```ts
const GOLDEN_DIR = 'training/player-screens';
describe.skipIf(!fs.existsSync(GOLDEN_DIR))('golden text crops', () => {
  it('en-rental: every ability/item/move text matches top-1 among its slot candidates', async () => {
    const { loadPng } = await import('../../../scripts/hp-accuracy-core');
    const { detectPlayerPanels } = await import('./playerPanels');
    const { textShapeAt } = await import('./textMatch');
    const golden = JSON.parse(fs.readFileSync('training/player-golden.json', 'utf8'))['en-rental'];
    const img = loadPng(`${GOLDEN_DIR}/${golden.movesImage}`);
    const det = detectPlayerPanels(img)!;
    det.panels.forEach((panel, slot) => {
      const expected = golden.team[slot];
      // decoy pool: every other golden value of the same field type
      const allMoves = golden.team.flatMap((t: any) => t.moves);
      const check = (box: any, target: string, pool: string[]) => {
        const shape = textShapeAt(img, box);
        expect(shape, `${target} region has ink`).not.toBeNull();
        const cands = [...new Set([target, ...pool])].map(l => ({ key: l, label: l }));
        const top = matchTextShape(shape!, cands, render, 1)[0];
        expect(top?.key, `slot ${slot + 1}`).toBe(target);
      };
      check(panel.abilityText, expected.ability, golden.team.map((t: any) => t.ability));
      check(panel.itemText, expected.item, golden.team.map((t: any) => t.item));
      expected.moves.forEach((m: string, j: number) => check(panel.moveTexts![j], m, allMoves));
    });
  }, 300_000);
});
```

Run: `npx vitest run src/features/scan/textMatch.test.ts`
Expected: PASS. This is the design's declared risk; if top-1 fails on specific fields, tune in this order: `whiteMask` threshold in `textShapeAt`, `FONT` weight/size, `shapeDistance` weights. Only if EN can't reach 100% here, stop and flag to the user (the spec's fallback — per-language glyph atlas — is a design change).

- [ ] **Step 7: Commit**

```bash
git add src/features/scan/textMatch.ts src/features/scan/textMatch.test.ts package.json package-lock.json
git commit -m "feat(scan): binarized text-shape matching against rendered candidates"
```

---

### Task 6: Scan vocabulary — `scan.repo.ts`

**Files:**
- Create: `src/db/repositories/scan.repo.ts`
- Create: `src/db/repositories/scan.repo.test.ts`

**Interfaces:**
- Consumes: `getDb` from `src/db`; `moves`, `pokemonMoves`, `abilities`, `pokemonAbilities`, `items` from `src/db/schema`; `Generations` from `@smogon/calc`; `MEGA_STONES` from `src/features/pokemon/utils/items.ts`; `ScanLang`, `TextCandidate` types.
- Produces (Task 7/8 rely on):

```ts
export interface LocalizedNames { en: string; ja: string | null; zhHant: string | null; zhHans: string | null }
export interface MoveVocabEntry { moveId: number; names: LocalizedNames }
export interface NameVocabEntry { key: string; names: LocalizedNames }   // key = English name
export interface PlayerScanVocab {
  movesFor(pokemonId: number): MoveVocabEntry[];
  abilitiesFor(pokemonId: number): NameVocabEntry[];
  items: NameVocabEntry[];
}
export function buildPlayerScanVocab(rows: {
  moves: Array<{ id: number; nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }>;
  learnset: Array<{ pokemonId: number; moveId: number }>;
  abilities: Array<{ pokemonId: number; nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }>;
  items: Array<{ nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }>;
}): PlayerScanVocab;                                    // pure, node-testable
export async function loadPlayerScanVocab(): Promise<PlayerScanVocab>;  // browser, via getDb()
export function candidatesForLang(entries: Array<{ key?: string; moveId?: number; names: LocalizedNames }>, lang: ScanLang): TextCandidate[];
```

`candidatesForLang` keys: `String(moveId)` for moves, `names.en` otherwise; label = the lang's name with English fallback. Item vocabulary is filtered to `Generations.get(9).items` names ∪ `MEGA_STONES`.

- [ ] **Step 1: Write failing test for the pure builder**

`src/db/repositories/scan.repo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildPlayerScanVocab, candidatesForLang } from './scan.repo';

const rows = {
  moves: [
    { id: 1, nameEn: 'Pound', nameJa: 'はたく', nameZh: '拍擊', nameZhHans: '拍击' },
    { id: 182, nameEn: 'Protect', nameJa: 'まもる', nameZh: '守住', nameZhHans: '守住' },
  ],
  learnset: [{ pokemonId: 25, moveId: 182 }],
  abilities: [{ pokemonId: 25, nameEn: 'Static', nameJa: 'せいでんき', nameZh: '靜電', nameZhHans: '静电' }],
  items: [
    { nameEn: 'Leftovers', nameJa: 'たべのこし', nameZh: '吃剩的東西', nameZhHans: '吃剩的东西' },
    { nameEn: 'Definitely Not A Real Item', nameJa: null, nameZh: null, nameZhHans: null },
  ],
};

describe('buildPlayerScanVocab', () => {
  const vocab = buildPlayerScanVocab(rows);
  it('learnset lookup', () => {
    expect(vocab.movesFor(25).map(m => m.moveId)).toEqual([182]);
    expect(vocab.movesFor(999)).toEqual([]);
  });
  it('abilities lookup', () => {
    expect(vocab.abilitiesFor(25)[0].key).toBe('Static');
  });
  it('items filtered to legal vocabulary', () => {
    const names = vocab.items.map(i => i.key);
    expect(names).toContain('Leftovers');
    expect(names).not.toContain('Definitely Not A Real Item');
  });
  it('candidatesForLang: language selection with en fallback', () => {
    const zh = candidatesForLang(vocab.movesFor(25), 'zh-Hant');
    expect(zh).toEqual([{ key: '182', label: '守住' }]);
    const en = candidatesForLang(vocab.items, 'en');
    expect(en.find(c => c.key === 'Leftovers')?.label).toBe('Leftovers');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/db/repositories/scan.repo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/db/repositories/scan.repo.ts`:

```ts
import { eq } from 'drizzle-orm';
import { Generations } from '@smogon/calc';
import { getDb } from '../index';
import { moves, pokemonMoves, abilities, pokemonAbilities, items } from '../schema';
import { MEGA_STONES } from '@/features/pokemon/utils/items';
import type { ScanLang } from '@/features/scan/playerTypes';
import type { TextCandidate } from '@/features/scan/textMatch';

export interface LocalizedNames { en: string; ja: string | null; zhHant: string | null; zhHans: string | null }
export interface MoveVocabEntry { moveId: number; names: LocalizedNames }
export interface NameVocabEntry { key: string; names: LocalizedNames }

export interface PlayerScanVocab {
  movesFor(pokemonId: number): MoveVocabEntry[];
  abilitiesFor(pokemonId: number): NameVocabEntry[];
  items: NameVocabEntry[];
}

interface VocabRows {
  moves: Array<{ id: number; nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }>;
  learnset: Array<{ pokemonId: number; moveId: number }>;
  abilities: Array<{ pokemonId: number; nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }>;
  items: Array<{ nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }>;
}

const legalItemNames = (): Set<string> => {
  const s = new Set<string>(MEGA_STONES);
  for (const item of Generations.get(9).items) s.add(item.name);
  return s;
};

const names = (r: { nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }): LocalizedNames =>
  ({ en: r.nameEn, ja: r.nameJa, zhHant: r.nameZh, zhHans: r.nameZhHans });

export function buildPlayerScanVocab(rows: VocabRows): PlayerScanVocab {
  const movesById = new Map(rows.moves.map(m => [m.id, m]));
  const learnsetByPokemon = new Map<number, number[]>();
  for (const { pokemonId, moveId } of rows.learnset) {
    if (!learnsetByPokemon.has(pokemonId)) learnsetByPokemon.set(pokemonId, []);
    learnsetByPokemon.get(pokemonId)!.push(moveId);
  }
  const abilitiesByPokemon = new Map<number, NameVocabEntry[]>();
  for (const a of rows.abilities) {
    if (!abilitiesByPokemon.has(a.pokemonId)) abilitiesByPokemon.set(a.pokemonId, []);
    abilitiesByPokemon.get(a.pokemonId)!.push({ key: a.nameEn, names: names(a) });
  }
  const legal = legalItemNames();
  return {
    movesFor: (id) => (learnsetByPokemon.get(id) ?? [])
      .map(mid => movesById.get(mid))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map(m => ({ moveId: m.id, names: names(m) })),
    abilitiesFor: (id) => abilitiesByPokemon.get(id) ?? [],
    items: rows.items.filter(i => legal.has(i.nameEn)).map(i => ({ key: i.nameEn, names: names(i) })),
  };
}

let cached: Promise<PlayerScanVocab> | null = null;
export async function loadPlayerScanVocab(): Promise<PlayerScanVocab> {
  if (cached) return cached;
  cached = (async () => {
    const db = await getDb();
    const [moveRows, learnRows, abilityRows, itemRows] = await Promise.all([
      db.select().from(moves),
      db.select().from(pokemonMoves),
      db.select({
        pokemonId: pokemonAbilities.pokemonId,
        nameEn: abilities.nameEn, nameJa: abilities.nameJa,
        nameZh: abilities.nameZh, nameZhHans: abilities.nameZhHans,
      }).from(pokemonAbilities).innerJoin(abilities, eq(pokemonAbilities.abilityId, abilities.id)),
      db.select().from(items),
    ]);
    return buildPlayerScanVocab({
      moves: moveRows as any, learnset: learnRows as any,
      abilities: abilityRows as any, items: itemRows as any,
    });
  })();
  return cached;
}

export function candidatesForLang(
  entries: Array<{ key?: string; moveId?: number; names: LocalizedNames }>, lang: ScanLang,
): TextCandidate[] {
  const pick = (n: LocalizedNames) =>
    lang === 'en' ? n.en : lang === 'ja' ? n.ja : lang === 'zh-Hant' ? n.zhHant : n.zhHans;
  return entries.map(e => ({
    key: e.moveId != null ? String(e.moveId) : e.key!,
    label: pick(e.names) ?? e.names.en,
  }));
}
```

For the `innerJoin` placeholder: use the same drizzle `eq(...)` join pattern the Teams page uses inline (`src/pages/Teams/index.tsx:93-97`) — import `eq` from `drizzle-orm` and join on `pokemonAbilities.abilityId = abilities.id`. Check the actual column property name in `schema.ts` (likely `abilityId`).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/db/repositories/scan.repo.test.ts`
Expected: PASS. Also typecheck: `npx tsc --noEmit` — expected clean (the join must be a real drizzle expression, not the placeholder).

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/scan.repo.ts src/db/repositories/scan.repo.test.ts
git commit -m "feat(db): player-scan vocabulary loader (learnset/abilities/items, 4 languages)"
```

---

### Task 7: Per-image scan — `scanPlayerFrame.ts`

**Files:**
- Create: `src/features/scan/scanPlayerFrame.ts`
- Create: `src/features/scan/scanPlayerFrame.test.ts`
- Create: `scripts/player-scan-core.ts` (node-side helpers reused by Task 11)

**Interfaces:**
- Consumes: `detectPlayerPanels` (Task 3), `readStatCell` (Task 4), `textShapeAt`/`matchTextShape`/`TextRenderer` (Task 5), `PlayerScanVocab`/`candidatesForLang` (Task 6), `Classifier`/`loadClassifier` + descriptor pieces from existing modules.
- Produces (Task 8/9 rely on):

```ts
export interface TextFieldRead { byLang: Record<ScanLang, TextMatchResult[]> }  // ranked, may be empty arrays
export interface MovesPanelRead {
  slot: number; species: Candidate[];
  ability: TextFieldRead | null;   // null = blank region
  item: TextFieldRead | null;
  moves: Array<TextFieldRead | null>;  // length 4
}
export interface StatsPanelRead { slot: number; species: Candidate[]; rows: StatRowRead[] } // length 6, [hp,atk,def,spa,spd,spe]
export type PlayerFrameScan =
  | { kind: 'moves'; panels: MovesPanelRead[] }
  | { kind: 'stats'; panels: StatsPanelRead[] };

export interface PlayerScanDeps {
  loadRefs(): Promise<ReferenceEntry[]>;
  loadClassifier(): Promise<Classifier | null>;
  matchTile(img: RgbaImage, refs: ReferenceEntry[], topN: number): Candidate[];
  cropImage(img: RgbaImage, box: TileBox): RgbaImage;
  render: TextRenderer;
}
export const PLAYER_SCAN_DEPS: PlayerScanDeps; // browser defaults

export async function scanPlayerImage(
  img: RgbaImage, legalIds: Set<number>, vocab: PlayerScanVocab, deps?: PlayerScanDeps,
): Promise<PlayerFrameScan | null>;  // null = panel detection failed

export function rescanMovesPanelText(   // used by the hook when the user corrects a species
  img: RgbaImage, panel: PanelRegions, speciesId: number, vocab: PlayerScanVocab, render: TextRenderer,
): Pick<MovesPanelRead, 'ability' | 'moves'>;
```

- `scripts/player-scan-core.ts` produces node-side deps for tests: `loadPngRefs()` (reads `public/images/pokemon/reference-descriptors.json` via fs + `parseReferenceMap`), `nodeRender` (Task 5's `makeTextRenderer` over `canvas`), `buildVocabNode()` (better-sqlite3 queries → `buildPlayerScanVocab`), `nodeScanDeps: PlayerScanDeps` (classifier = `async () => null`, so species falls back to descriptors).

- [ ] **Step 1: Write failing unit test with fake deps**

`src/features/scan/scanPlayerFrame.test.ts` — synthetic image from Task 3's painter, fake deps that return canned candidates, assert structure and the classifier→descriptor fallback:

```ts
import { describe, it, expect } from 'vitest';
import type { RgbaImage } from './types';
import { scanPlayerImage } from './scanPlayerFrame';
import { buildPlayerScanVocab } from '@/db/repositories/scan.repo';

// blank/fillRect/paintSixPanels: copy from playerPanels.test.ts
/* ... same helpers ... */

const vocab = buildPlayerScanVocab({
  moves: [{ id: 182, nameEn: 'Protect', nameJa: 'まもる', nameZh: '守住', nameZhHans: '守住' }],
  learnset: [{ pokemonId: 7, moveId: 182 }],
  abilities: [{ pokemonId: 7, nameEn: 'Torrent', nameJa: null, nameZh: null, nameZhHans: null }],
  items: [],
});

const fakeDeps = {
  loadRefs: async () => [],
  loadClassifier: async () => null,
  matchTile: () => [{ id: 7, score: 0.9 }],
  cropImage: (img: RgbaImage) => img,
  render: () => ({ bits: new Uint8Array(0), w: 0, h: 0 }),
};

describe('scanPlayerImage', () => {
  it('returns null when no panels', async () => {
    expect(await scanPlayerImage(blank(200, 200), new Set([7]), vocab, fakeDeps)).toBeNull();
  });
  it('moves screen: 6 panels with species from descriptor fallback', async () => {
    const img = blank(1280, 720);
    paintSixPanels(img);
    const scan = await scanPlayerImage(img, new Set([7]), vocab, fakeDeps);
    expect(scan?.kind).toBe('moves');
    expect(scan?.panels).toHaveLength(6);
    if (scan?.kind === 'moves') {
      expect(scan.panels[0].species[0]?.id).toBe(7);
      expect(scan.panels[0].moves).toHaveLength(4);
      // blank text regions (renderer/mask yields no ink) → null fields
      expect(scan.panels[0].ability).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/scan/scanPlayerFrame.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/features/scan/scanPlayerFrame.ts`:

```ts
import type { RgbaImage, TileBox, Candidate, ReferenceEntry } from './types';
import { detectPlayerPanels } from './playerPanels';
import type { PanelRegions, ScanLang } from './playerTypes';
import { readStatCell, type StatRowRead } from './statDigits';
import { textShapeAt, matchTextShape, browserTextRenderer, type TextRenderer, type TextMatchResult } from './textMatch';
import { loadReferenceDescriptors, filterByFormatLegal } from './referenceData';
import { loadClassifier, type Classifier } from './classifier';
import { computeDescriptor } from './fingerprint';
import { matchTile } from './match';
import { cropImage } from './segmentation';
import { candidatesForLang, type PlayerScanVocab } from '@/db/repositories/scan.repo';

export const LANGS: ScanLang[] = ['en', 'ja', 'zh-Hant', 'zh-Hans'];
const CLASSIFIER_CONFIDENCE_THRESHOLD = 0.5; // mirror scanFrame.ts

export interface TextFieldRead { byLang: Record<ScanLang, TextMatchResult[]> }
export interface MovesPanelRead {
  slot: number; species: Candidate[];
  ability: TextFieldRead | null; item: TextFieldRead | null;
  moves: Array<TextFieldRead | null>;
}
export interface StatsPanelRead { slot: number; species: Candidate[]; rows: StatRowRead[] }
export type PlayerFrameScan =
  | { kind: 'moves'; panels: MovesPanelRead[] }
  | { kind: 'stats'; panels: StatsPanelRead[] };

export interface PlayerScanDeps {
  loadRefs(): Promise<ReferenceEntry[]>;
  loadClassifier(): Promise<Classifier | null>;
  matchTile(img: RgbaImage, refs: ReferenceEntry[], topN: number): Candidate[];
  cropImage(img: RgbaImage, box: TileBox): RgbaImage;
  render: TextRenderer;
}

export const PLAYER_SCAN_DEPS: PlayerScanDeps = {
  loadRefs: loadReferenceDescriptors,
  loadClassifier,
  matchTile: (img, refs, topN) => matchTile(computeDescriptor(img), refs, topN),
  cropImage,
  render: browserTextRenderer,
};

function readTextField(
  img: RgbaImage, box: TileBox | undefined,
  entries: Array<{ key?: string; moveId?: number; names: any }>,
  render: TextRenderer,
): TextFieldRead | null {
  if (!box) return null;
  const shape = textShapeAt(img, box);
  if (!shape) return null;
  const byLang = {} as TextFieldRead['byLang'];
  for (const lang of LANGS) {
    byLang[lang] = matchTextShape(shape, candidatesForLang(entries, lang), render);
  }
  return { byLang };
}

export function rescanMovesPanelText(
  img: RgbaImage, panel: PanelRegions, speciesId: number, vocab: PlayerScanVocab, render: TextRenderer,
): Pick<MovesPanelRead, 'ability' | 'moves'> {
  return {
    ability: readTextField(img, panel.abilityText, vocab.abilitiesFor(speciesId), render),
    moves: (panel.moveTexts ?? []).map(b => readTextField(img, b, vocab.movesFor(speciesId), render)),
  };
}

export async function scanPlayerImage(
  img: RgbaImage, legalIds: Set<number>, vocab: PlayerScanVocab, deps: PlayerScanDeps = PLAYER_SCAN_DEPS,
): Promise<PlayerFrameScan | null> {
  const det = detectPlayerPanels(img);
  if (!det) return null;
  const refs = filterByFormatLegal(await deps.loadRefs(), legalIds);
  const classifier = await deps.loadClassifier();

  const speciesFor = async (panel: PanelRegions): Promise<Candidate[]> => {
    const tile = deps.cropImage(img, panel.sprite);
    const fromClassifier = classifier ? await classifier.classify(tile, legalIds, 3) : [];
    const useFallback = !classifier || (fromClassifier[0]?.score ?? 0) < CLASSIFIER_CONFIDENCE_THRESHOLD;
    return useFallback ? deps.matchTile(tile, refs, 3) : fromClassifier;
  };

  if (det.kind === 'stats') {
    const panels: StatsPanelRead[] = [];
    for (let i = 0; i < det.panels.length; i++) {
      panels.push({
        slot: i, species: await speciesFor(det.panels[i]),
        rows: det.panels[i].statCells!.map(c => readStatCell(img, c)),
      });
    }
    return { kind: 'stats', panels };
  }

  const panels: MovesPanelRead[] = [];
  for (let i = 0; i < det.panels.length; i++) {
    const p = det.panels[i];
    const species = await speciesFor(p);
    const speciesId = species[0]?.id ?? null;
    panels.push({
      slot: i, species,
      item: readTextField(img, p.itemText, vocab.items, deps.render),
      ...(speciesId != null
        ? rescanMovesPanelText(img, p, speciesId, vocab, deps.render)
        : { ability: null, moves: [null, null, null, null] }),
    });
  }
  return { kind: 'moves', panels };
}
```

- [ ] **Step 4: Run unit tests**

Run: `npx vitest run src/features/scan/scanPlayerFrame.test.ts`
Expected: PASS.

- [ ] **Step 5: Node-side deps + golden full-frame test**

`scripts/player-scan-core.ts`:

```ts
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { createCanvas } from 'canvas';
import { parseReferenceMap } from '../src/features/scan/referenceData';
import { makeTextRenderer } from '../src/features/scan/textMatch';
import { computeDescriptor } from '../src/features/scan/fingerprint';
import { matchTile } from '../src/features/scan/match';
import { cropImage } from '../src/features/scan/segmentation';
import { buildPlayerScanVocab, type PlayerScanVocab } from '../src/db/repositories/scan.repo';
import type { PlayerScanDeps } from '../src/features/scan/scanPlayerFrame';

export const nodeRender = makeTextRenderer((w, h) => createCanvas(w, h));

export function loadNodeRefs() {
  const map = JSON.parse(fs.readFileSync('public/images/pokemon/reference-descriptors.json', 'utf8'));
  return parseReferenceMap(map);
}

export function buildVocabNode(): PlayerScanVocab {
  const db = new Database('vgc_pokemon.db', { readonly: true });
  const q = <T>(sql: string): T[] => db.prepare(sql).all() as T[];
  return buildPlayerScanVocab({
    moves: q("SELECT id, name_en AS nameEn, name_ja AS nameJa, name_zh AS nameZh, name_zh_hans AS nameZhHans FROM moves"),
    learnset: q("SELECT pokemon_id AS pokemonId, move_id AS moveId FROM pokemon_moves"),
    abilities: q(`SELECT pa.pokemon_id AS pokemonId, a.name_en AS nameEn, a.name_ja AS nameJa,
                         a.name_zh AS nameZh, a.name_zh_hans AS nameZhHans
                  FROM pokemon_abilities pa JOIN abilities a ON a.id = pa.ability_id`),
    items: q("SELECT name_en AS nameEn, name_ja AS nameJa, name_zh AS nameZh, name_zh_hans AS nameZhHans FROM items WHERE name_en IS NOT NULL"),
  });
}

export const nodeScanDeps: PlayerScanDeps = {
  loadRefs: async () => loadNodeRefs(),
  loadClassifier: async () => null,   // node: descriptor-only species matching
  matchTile: (img, refs, topN) => matchTile(computeDescriptor(img), refs, topN),
  cropImage,
  render: nodeRender,
};
```

Append golden test to `scanPlayerFrame.test.ts`:

```ts
const GOLDEN_DIR = 'training/player-screens';
describe.skipIf(!fs.existsSync(GOLDEN_DIR))('golden full-frame scans', () => {
  it('en-rental moves image: species + per-field en top-1 all correct', async () => {
    const { loadPng } = await import('../../../scripts/hp-accuracy-core');
    const { nodeScanDeps, buildVocabNode } = await import('../../../scripts/player-scan-core');
    const golden = JSON.parse(fs.readFileSync('training/player-golden.json', 'utf8'))['en-rental'];
    const img = loadPng(`${GOLDEN_DIR}/${golden.movesImage}`);
    const db = (await import('better-sqlite3')).default('vgc_pokemon.db', { readonly: true }) as any;
    const idByName = (n: string) => (db.prepare('SELECT id FROM pokemon WHERE name_en = ?').get(n) as any)?.id;
    const moveName = (id: string) => (db.prepare('SELECT name_en FROM moves WHERE id = ?').get(Number(id)) as any)?.name_en;
    const legalIds = new Set<number>(golden.team.map((t: any) => idByName(t.species)));
    const scan = await scanPlayerImage(img, legalIds, buildVocabNode(), nodeScanDeps);
    expect(scan?.kind).toBe('moves');
    if (scan?.kind !== 'moves') return;
    scan.panels.forEach((panel, slot) => {
      const expected = golden.team[slot];
      expect(panel.species[0]?.id, `slot ${slot + 1} species`).toBe(idByName(expected.species));
      expect(panel.ability?.byLang.en[0]?.key).toBe(expected.ability);
      expect(panel.item?.byLang.en[0]?.key).toBe(expected.item);
      expected.moves.forEach((m: string, j: number) => {
        expect(moveName(panel.moves[j]!.byLang.en[0]!.key), `slot ${slot + 1} move ${j + 1}`).toBe(m);
      });
    });
  }, 600_000);
});
```

Run: `npx vitest run src/features/scan/scanPlayerFrame.test.ts`
Expected: PASS. Species via descriptors may need the sprite crop region tightened (Task 3 constants) — the header sprites are the same menu-sprite artwork the descriptors were built from.

- [ ] **Step 6: Commit**

```bash
git add src/features/scan/scanPlayerFrame.ts src/features/scan/scanPlayerFrame.test.ts scripts/player-scan-core.ts
git commit -m "feat(scan): per-image player frame scan (species + text fields + stat rows)"
```

---

### Task 8: Merge + nature solver — `mergePlayerScan.ts`

**Files:**
- Create: `src/features/scan/mergePlayerScan.ts`
- Create: `src/features/scan/mergePlayerScan.test.ts`

**Interfaces:**
- Consumes: `PlayerFrameScan`/`MovesPanelRead`/`StatsPanelRead` (Task 7), `championsHP`/`championsStat`, `getNatureFromStats`/`getFormattedNature`/`getNatureStats`, `PokemonBaseStats`, `MoveData`, `PlayerScanVocab`.
- Produces (Task 9/10 rely on):

```ts
export interface FieldRead<T> { value: T | null; options: Array<{ value: T; score: number }>; confident: boolean }
export interface SlotStatRead { stat: number | null; sp: number | null; mult: 0.9 | 1 | 1.1 | null; consistent: boolean }
export interface PlayerSlot {
  slot: number;
  species: Candidate[];             // ranked; [0] is current pick
  ability: FieldRead<string>;       // English ability name
  item: FieldRead<string>;          // English item name
  moves: Array<FieldRead<number>>;  // move ids, length 4
  statReads: SlotStatRead[];        // length 6 [hp,atk,def,spa,spd,spe]; empty array if stats image missing
  nature: { name: string; confident: boolean };  // display-form name via getFormattedNature
  warnings: string[];
}
export interface MergedPlayerScan { lang: ScanLang | null; slots: PlayerSlot[]; warnings: string[] }

export function mergePlayerScan(
  movesScan: Extract<PlayerFrameScan, { kind: 'moves' }> | null,
  statsScan: Extract<PlayerFrameScan, { kind: 'stats' }> | null,
  basesById: Map<number, PokemonBaseStats>,
): MergedPlayerScan;

export function buildConfigs(
  merged: MergedPlayerScan,
  basesById: Map<number, PokemonBaseStats>,
  movesById: Map<number, MoveData>,
  vocab: PlayerScanVocab,
): PokemonConfig[];

// exported for tests
export function pickLang(fields: TextFieldRead[]): ScanLang | null;
export function solveStatRow(base: number, read: StatRowRead): SlotStatRead; // non-HP rows
```

- [ ] **Step 1: Write failing tests (pure math + merge behavior)**

`src/features/scan/mergePlayerScan.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { solveStatRow, mergePlayerScan, buildConfigs, pickLang } from './mergePlayerScan';
import { championsStat } from '@/features/pokemon/utils/champions-stats';

describe('solveStatRow', () => {
  it('exhaustive: unique multiplier recovered for every base/sp/nature combo', () => {
    for (const base of [50, 75, 100, 135, 180]) {
      for (let sp = 0; sp <= 32; sp++) {
        for (const mult of [0.9, 1.0, 1.1] as const) {
          const stat = championsStat(base, sp, mult);
          const arrow = mult === 1.1 ? 'up' : mult === 0.9 ? 'down' : null;
          const r = solveStatRow(base, { stat, sp, arrow });
          expect(r.mult).toBe(mult === 1.0 ? 1 : mult);
          expect(r.consistent).toBe(true);
        }
      }
    }
  });
  it('arrow/math disagreement flags inconsistent, math wins', () => {
    const stat = championsStat(100, 10, 1.0);
    const r = solveStatRow(100, { stat, sp: 10, arrow: 'up' });
    expect(r.mult).toBe(1);
    expect(r.consistent).toBe(false);
  });
  it('auto-repair: bad stat digit, arrow + sp reproduce the row', () => {
    // read stat fits no multiplier; arrow says up; sp read ok
    const r = solveStatRow(100, { stat: 999, sp: 10, arrow: 'up' });
    expect(r.mult).toBe(1.1);
    expect(r.stat).toBe(championsStat(100, 10, 1.1)); // repaired
    expect(r.consistent).toBe(false);
  });
  it('null reads propagate', () => {
    const r = solveStatRow(100, { stat: null, sp: null, arrow: null });
    expect(r.mult).toBeNull();
    expect(r.consistent).toBe(false);
  });
});

describe('nature derivation via merge', () => {
  // build a minimal fake stats scan for one slot: Adamant (atk up, spa down), bases 100 flat
  const bases = { id: 1, identifier: 'x', nameEn: 'X', nameZh: null, type1: 'Water', type2: null,
    baseHp: 100, baseAttack: 100, baseDefense: 100, baseSpAtk: 100, baseSpDef: 100, baseSpeed: 100 } as any;
  const mkRow = (mult: 0.9 | 1 | 1.1, sp = 4) => ({
    stat: championsStat(100, sp, mult), sp, arrow: mult === 1.1 ? 'up' as const : mult === 0.9 ? 'down' as const : null,
  });
  const statsScan = {
    kind: 'stats' as const,
    panels: [{ slot: 0, species: [{ id: 1, score: 0.9 }], rows: [
      { stat: 100 + 75 + 4, sp: 4, arrow: null }, mkRow(1.1), mkRow(1), mkRow(0.9), mkRow(1), mkRow(1),
    ] }],
  };
  it('one up + one down = exact nature, confident', () => {
    const merged = mergePlayerScan(null, statsScan, new Map([[1, bases]]));
    expect(merged.slots[0].nature.name).toContain('Adamant');
    expect(merged.slots[0].nature.confident).toBe(true);
  });
  it('no arrows and all-neutral math = Serious', () => {
    const neutral = { ...statsScan, panels: [{ ...statsScan.panels[0], rows: [
      { stat: 179, sp: 4, arrow: null }, mkRow(1), mkRow(1), mkRow(1), mkRow(1), mkRow(1) ] }] };
    const merged = mergePlayerScan(null, neutral, new Map([[1, bases]]));
    expect(merged.slots[0].nature.name).toContain('Serious');
  });
});

describe('pickLang', () => {
  it('majority-score language wins', () => {
    const f = (en: number, zh: number) => ({ byLang: {
      en: [{ key: 'a', score: en }], ja: [], 'zh-Hant': [{ key: 'a', score: zh }], 'zh-Hans': [],
    } }) as any;
    expect(pickLang([f(0.9, 0.6), f(0.85, 0.5)])).toBe('en');
    expect(pickLang([f(0.6, 0.9), f(0.5, 0.95)])).toBe('zh-Hant');
    expect(pickLang([])).toBeNull();
  });
});
```

Plus a `buildConfigs` test: one merged slot → `PokemonConfig` with `selectedId`, bases copied, `spHp..spSpe` from statReads, `nature`/`boostedStat`/`hinderedStat` consistent with `getNatureStats(nature)`, `moves` resolved to `MoveData`, `activeAbility`/`item` set, `hpPercent: 100`, `activeMoveIndex: 0`, `isTypeOverridden: false`, `abilities` = English ability list from vocab. Write it with a two-move fake `movesById` and the fake vocab from Task 6's test.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/scan/mergePlayerScan.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/features/scan/mergePlayerScan.ts` — key logic (write the full module around these):

```ts
const MULTS = [0.9, 1, 1.1] as const;
const CONFIDENT_SCORE = 0.72;   // CALIBRATE against goldens
const CONFIDENT_MARGIN = 0.03;  // CALIBRATE

export function solveStatRow(base: number, read: StatRowRead): SlotStatRead {
  const { stat, sp, arrow } = read;
  const arrowMult = arrow === 'up' ? 1.1 : arrow === 'down' ? 0.9 : 1;
  if (stat != null && sp != null) {
    const mathMult = MULTS.find(m => championsStat(base, sp, m) === stat) ?? null;
    if (mathMult != null) {
      return { stat, sp, mult: mathMult, consistent: mathMult === arrowMult };
    }
    // digits fit no multiplier: trust arrow + sp, repair stat
    return { stat: championsStat(base, sp, arrowMult), sp, mult: arrowMult, consistent: false };
  }
  if (sp != null) return { stat: championsStat(base, sp, arrowMult), sp, mult: arrowMult, consistent: false };
  if (stat != null) {
    // recover sp from stat + arrow
    for (let s = 0; s <= 32; s++) if (championsStat(base, s, arrowMult) === stat)
      return { stat, sp: s, mult: arrowMult, consistent: false };
  }
  return { stat, sp, mult: null, consistent: false };
}
```

- HP row (index 0) is solved separately: consistent iff `stat === championsHP(base, sp)`; repair the missing side when one read is null (`sp = stat - base - 75` clamped to 0..32, or `stat = championsHP(base, sp)`).
- `pickLang`: for each language, mean of `byLang[lang][0].score` over all fields that have at least one result; return the argmax language (null when no fields). Ties break in `LANGS` order.
- Nature: from the five non-HP `SlotStatRead.mult`s — exactly one 1.1 and one 0.9 → `getFormattedNature(getNatureFromStats(<boostKey>, <hinderKey>))` with keys from `['atk','def','spa','spd','spe']` by row index (check `getNatureFromStats`'s expected case in `pokemon-natures.ts:67` and match it — the Step 1 test pins the output). All mults 1 → `'Serious'`, confident when all rows consistent. Any other pattern (two ups, up without down, null mults) → `'Serious'`, `confident: false`, warning pushed.
- Field resolution from `TextFieldRead` at the chosen language: `value = list[0]?.key` (moves parse `Number(key)`), `confident = list[0] && list[0].score >= CONFIDENT_SCORE && (list.length < 2 || list[0].score - list[1].score >= CONFIDENT_MARGIN)`, `options` = top 3 mapped to values.
- Species per slot: moves-image candidates win when both images have them and disagree (moves-image sprite crops are identical in practice; disagreement pushes a warning and `confident` handling stays at the field level).
- Missing image: moves-only → `statReads: []`, nature `'Serious'` unconfident, warning `'stats screen not scanned'`; stats-only → ability/item/moves as unconfident empty `FieldRead`s (`value: null, options: [], confident: false`), warning `'moves screen not scanned'`.
- `buildConfigs`: skip slots with no species candidate; map exactly as the Teams import does (`src/pages/Teams/index.tsx:146-172` is the reference): bases/types from `basesById`, `spHp..spSpe` from `statReads[i].sp ?? 0`, `boostedStat`/`hinderedStat` from `getNatureStats(nature)`, `moves` padded to 4 with null, `abilities: vocab.abilitiesFor(id).map(a => a.key)`, `activeAbility: ability.value`, `item: item.value`, `nature: <display form>`, `hpPercent: 100`, `activeMoveIndex: 0`, `isTypeOverridden: false`, `selectedId: species[0].id`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/scan/mergePlayerScan.test.ts`
Expected: PASS, including the exhaustive multiplier recovery (495 combos).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/mergePlayerScan.ts src/features/scan/mergePlayerScan.test.ts
git commit -m "feat(scan): two-image merge with arrow/math cross-validated nature solving"
```

---

### Task 9: Hook — `usePlayerTeamScan.ts`

**Files:**
- Create: `src/features/scan/usePlayerTeamScan.ts`
- Create: `src/features/scan/usePlayerTeamScan.test.ts`

**Interfaces:**
- Consumes: Tasks 3, 7, 8 modules; `blobToRgbaImage`; `loadPlayerScanVocab`; `PokemonBaseStats`.
- Produces (Task 10 relies on):

```ts
export type PlayerImageStatus = 'idle' | 'scanning' | 'done' | 'error';
export interface PlayerImageState {
  status: PlayerImageStatus;
  error: string | null;
  blob: Blob | null;        // kept for crop-and-retry
}
export interface PlayerTeamScanDeps {
  blobToRgbaImage(blob: Blob): Promise<RgbaImage>;
  loadVocab(): Promise<PlayerScanVocab>;
  scan: typeof scanPlayerImage;
  scanDeps: PlayerScanDeps;
}
export const DEFAULT_PLAYER_DEPS: PlayerTeamScanDeps;

export function usePlayerTeamScan(pokemonList: PokemonBaseStats[], deps?: PlayerTeamScanDeps): {
  movesImage: PlayerImageState;
  statsImage: PlayerImageState;
  merged: MergedPlayerScan | null;   // recomputed when either scan lands
  vocab: PlayerScanVocab | null;     // loaded on first addFrame; Task 10 passes it to buildConfigs
  addFrame(blob: Blob): Promise<void>;  // auto-routes by detected kind
  setSlotSpecies(slot: number, speciesId: number): void;  // re-matches ability/moves text for that slot
  removeImage(kind: PlayerScreenKind): void;
  reset(): void;
}
```

Behavior contract:
- `addFrame` decodes, scans; `scan` returns null → the frame's status is `'error'` with `'No team panels found — try cropping around the six panels.'` routed to whichever slot is empty (moves first), keeping the blob for crop-retry.
- Scanned kind already filled → replace it (rescanning the same screen is the natural retry gesture) — no error.
- `setSlotSpecies` re-runs `rescanMovesPanelText` on the kept moves image (raw `RgbaImage` held in a ref) and updates merged output; if there is no moves image it only overrides the species candidate list.
- `merged` computed from latest scans + `basesById` derived from `pokemonList`.

- [ ] **Step 1: Write failing hook test**

`src/features/scan/usePlayerTeamScan.test.ts`, first line `// @vitest-environment jsdom`, using the same harness as `useTeamScan.test.ts` (copy its `renderHook`/`act` imports):

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlayerTeamScan } from './usePlayerTeamScan';
import { buildPlayerScanVocab } from '@/db/repositories/scan.repo';

const pokemonList = [{ id: 7, nameEn: 'Squirtle', baseHp: 44, baseAttack: 48, baseDefense: 65,
  baseSpAtk: 50, baseSpDef: 64, baseSpeed: 43, type1: 'Water', type2: null, identifier: 'squirtle', nameZh: null }] as any;

const movesFrame = { kind: 'moves', panels: Array.from({ length: 6 }, (_, slot) => ({
  slot, species: [{ id: 7, score: 0.9 }], ability: null, item: null, moves: [null, null, null, null] })) } as any;
const statsFrame = { kind: 'stats', panels: Array.from({ length: 6 }, (_, slot) => ({
  slot, species: [{ id: 7, score: 0.9 }],
  rows: [{ stat: null, sp: null, arrow: null }, { stat: null, sp: null, arrow: null }, { stat: null, sp: null, arrow: null },
         { stat: null, sp: null, arrow: null }, { stat: null, sp: null, arrow: null }, { stat: null, sp: null, arrow: null }] })) } as any;

// blob sentinel: size 1 → moves frame, size 2 → stats frame, size 3 → null (detection failure)
const deps = {
  blobToRgbaImage: async () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  loadVocab: async () => buildPlayerScanVocab({ moves: [], learnset: [], abilities: [], items: [] }),
  scan: async (_img: any, _ids: any, _vocab: any, _deps: any) => null as any,
  scanDeps: {} as any,
};
const mkDeps = (frames: Record<number, any>) => ({
  ...deps,
  scan: async () => frames[currentSize] ?? null,
});
let currentSize = 1;
const blobOf = (size: number) => { currentSize = size; return new Blob([new Uint8Array(size)]); };

describe('usePlayerTeamScan', () => {
  it('routes frames by kind, replaces same-kind rescans, surfaces failures, resets', async () => {
    const d = mkDeps({ 1: movesFrame, 2: statsFrame });
    const { result } = renderHook(() => usePlayerTeamScan(pokemonList, d as any));

    await act(() => result.current.addFrame(blobOf(1)));
    expect(result.current.movesImage.status).toBe('done');
    expect(result.current.statsImage.status).toBe('idle');
    expect(result.current.merged?.slots).toHaveLength(6);

    await act(() => result.current.addFrame(blobOf(2)));
    expect(result.current.statsImage.status).toBe('done');
    expect(result.current.merged?.slots[0].statReads).toHaveLength(6);

    await act(() => result.current.addFrame(blobOf(1)));   // re-add moves: replace, no error
    expect(result.current.movesImage.status).toBe('done');
    expect(result.current.movesImage.error).toBeNull();

    await act(() => result.current.addFrame(blobOf(3)));   // detection failure
    // failure routes to a retry state without clobbering the good scans
    expect(result.current.movesImage.status === 'error' || result.current.statsImage.status === 'error').toBe(true);

    act(() => result.current.reset());
    expect(result.current.movesImage.status).toBe('idle');
    expect(result.current.statsImage.status).toBe('idle');
    expect(result.current.merged).toBeNull();
  });
});
```

(Adjust the failure-routing assertion to the implemented behavior: when both kinds are already `done`, a failed frame surfaces its error on a transient banner or the last-touched slot — pick one, assert it, document it in the hook's JSDoc.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/scan/usePlayerTeamScan.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

State: `useState` for the two `PlayerImageState`s + `useRef` for kept `RgbaImage`s and `PlayerFrameScan`s; `useMemo` for `basesById` and `merged` (recompute from refs via a `version` counter state, matching `useTeamScan`'s minimal-state style). `DEFAULT_PLAYER_DEPS = { blobToRgbaImage, loadVocab: loadPlayerScanVocab, scan: scanPlayerImage, scanDeps: PLAYER_SCAN_DEPS }`. Derive `legalIds = new Set(pokemonList.map(p => p.id))`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/scan/usePlayerTeamScan.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/usePlayerTeamScan.ts src/features/scan/usePlayerTeamScan.test.ts
git commit -m "feat(scan): two-image player scan hook with auto-routing and slot re-scan"
```

---

### Task 10: UI — `PlayerScanModal` + Teams page wiring

**Files:**
- Create: `src/features/scan/PlayerScanModal.tsx`
- Modify: `src/pages/Teams/index.tsx`
- Modify: `src/features/teams/components/mobile/ArenaTeams.tsx` (add `onScanPlayer` prop + entry)

**Interfaces:**
- Consumes: `usePlayerTeamScan` (Task 9), `buildConfigs` (Task 8), `Modal` atom (`{ isOpen, onClose, title?, children, maxWidth? }`), `PokemonImage`, `CropStep` (`{ blob, onCropped, onCancel }`), `PokemonImagePicker` (`{ pokemonList, selectedId, onSelect }`), `filePickerSource`/`cameraSource` (`CaptureSource.capture(): Promise<CapturedFrame | null>`), `NATURES` + `getFormattedNature` from `pokemon-natures.ts`, `useTeams().createTeam(name, members)`, `getAllMoves` data via the Teams page's existing `fetchMetadata` (pass `moveList` in as a prop).
- Produces:

```ts
interface PlayerScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  pokemonList: PokemonBaseStats[];
  moveList: MoveData[];
  onSave: (members: PokemonConfig[]) => void; // page saves + navigates
}
```

- [ ] **Step 1: Implement the modal**

`PlayerScanModal.tsx`, structured like `ScanTeamModal` (raw Tailwind, same button styles). Sections:

1. **Ingest strip** (always visible): two status chips — `Moves & item` / `Stats & nature` — each showing idle (`Add screenshot` + `Take photo` buttons routed through `filePickerSource`/`cameraSource` → `addFrame(frame.blob)`), scanning (spinner), done (green check + `Rescan` = same buttons again), or error (message + `Crop & retry` → `CropStep` on the kept blob → `addFrame(cropped)`). Any capture goes through the same `addFrame`; auto-routing decides which chip lights up. Copy: "Add both screens of your team — moves/item and stats. Order doesn't matter."
2. **Review grid** (when `merged` non-null): one card per slot with a species candidate row (chips exactly like `ScanTeamModal` lines 223-252: `PokemonImage` + name + score; clicking calls `setSlotSpecies`; a `Choose Pokémon` toggle opens `PokemonImagePicker`), then rows:
   - **Ability**: native `<select>` over `merged.slots[i].ability.options` labels ∪ full ability list for the species; pre-select `value`; amber ring (`ring-2 ring-warning`) when `!confident`.
   - **Item**: same pattern over item options ∪ a datalist of all legal items.
   - **Moves**: 4 native `<select>`s over that slot's learnset (English names from `moveList`), pre-selected to matched move ids, amber ring when unconfident.
   - **SP row**: six `<input type="number" min="0" max="32">` bound to `statReads[j].sp ?? 0`, red ring when `statReads[j] && !statReads[j].consistent`.
   - **Nature**: `<select>` over `NATURES`, pre-set to `merged.slots[i].nature.name`, amber ring when `!nature.confident`.
   Local edits live in modal state seeded from `merged` (`useEffect` on `merged`, same pattern as `ScanTeamModal`'s roster seeding at lines 86-91).
3. **Footer**: partial-scan notice (`Only the {kind} screen was scanned — missing fields default`) when exactly one image is done; `Save team` button (disabled until ≥1 slot has a species) → assemble edited state into `MergedPlayerScan`-shaped values → `buildConfigs(edited, basesById, movesById, vocab)` using the hook's `vocab` (guard: button also disabled while `vocab` is null) → `onSave(configs)`; `Cancel` → `onClose` (hook `reset()` on close, mirroring `ScanTeamModal`). Build `movesById` from the `moveList` prop; `basesById` from `pokemonList`.

- [ ] **Step 2: Wire the Teams page**

In `src/pages/Teams/index.tsx`:
- State: `const [isPlayerScanOpen, setIsPlayerScanOpen] = useState(false);`
- Handler:

```ts
const handleSavePlayerTeam = async (members: PokemonConfig[]) => {
  if (!members.length) return;
  const first = pokemonList.find(p => p.id === members[0].selectedId);
  const teamId = await createTeam(`${first?.nameEn ?? 'Scanned'}'s Team`, members);
  setIsPlayerScanOpen(false);
  navigate(`/teams/${teamId}`);
};
```

- Desktop: next to the existing `Scan team` button (line ~275), add a sibling button `Scan my team` → `setIsPlayerScanOpen(true)` (copy the existing button's classes exactly).
- Mobile: pass `onScanPlayer={() => setIsPlayerScanOpen(true)}` into `ArenaTeams` (line ~223); in `ArenaTeams.tsx` add the optional prop `onScanPlayer?: () => void` and render a second action next to the existing `onScan` entry with the same row/button styling.
- Mount `<PlayerScanModal isOpen={isPlayerScanOpen} onClose={() => setIsPlayerScanOpen(false)} pokemonList={pokemonList} moveList={moveList} onSave={handleSavePlayerTeam} />` in **both** branches, right after the existing `ScanTeamModal` mounts (lines ~244 and ~415). `moveList` already exists in this component from `fetchMetadata`.

- [ ] **Step 3: Typecheck + full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean typecheck; all tests pass.

- [ ] **Step 4: Verify in the browser**

Start the dev server via the preview tools (`preview_start`), open the Teams page, and walk the flow with the golden screenshots as uploads: both chips go green, review grid shows 6 slots, uncertain fields ring amber, `Save team` lands on the team detail page with correct moves/item/ability/SP/nature. Screenshot the review grid as proof. Check the console for errors. (This mirrors the scan-verification routine used for scan v2.)

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/PlayerScanModal.tsx src/pages/Teams/index.tsx \
  src/features/teams/components/mobile/ArenaTeams.tsx
git commit -m "feat(scan): player team scan modal + Teams page entry"
```

---

### Task 11: End-to-end golden test + zh coverage

**Files:**
- Create: `scripts/player-scan-accuracy.test.ts`
- Modify: `training/player-golden.json` (zh entry if still pending)

**Interfaces:**
- Consumes: everything; `nodeScanDeps`/`buildVocabNode`/`nodeRender` from `scripts/player-scan-core.ts`.

- [ ] **Step 1: Complete the zh golden entry**

If Task 1 Step 5 left `"_todo"`: transcribe `zh-team17` now (Read the images, species by sprite, values in English via DB `name_zh` lookups), remove the marker, and re-run `npx vitest run scripts/verify-player-golden.test.ts` until the math checks pass.

- [ ] **Step 2: Write the end-to-end test**

`scripts/player-scan-accuracy.test.ts` — for every golden pair: scan both images with node deps, `mergePlayerScan`, `buildConfigs`, then assert the final `PokemonConfig[]` against the golden team:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { loadPng } from './hp-accuracy-core';
import { nodeScanDeps, buildVocabNode } from './player-scan-core';
import { scanPlayerImage } from '../src/features/scan/scanPlayerFrame';
import { mergePlayerScan, buildConfigs } from '../src/features/scan/mergePlayerScan';
import { getNatureStats, getFormattedNature } from '../src/features/pokemon/utils/pokemon-natures';

const GOLDEN_DIR = 'training/player-screens';

describe.skipIf(!fs.existsSync(GOLDEN_DIR))('player scan end-to-end', () => {
  const golden = JSON.parse(fs.readFileSync('training/player-golden.json', 'utf8'));
  const db = new Database('vgc_pokemon.db', { readonly: true });
  const pokemonByName = (n: string) => db.prepare(
    `SELECT id, identifier, name_en AS nameEn, name_zh AS nameZh, type1, type2,
            base_hp AS baseHp, base_attack AS baseAttack, base_defense AS baseDefense,
            base_sp_atk AS baseSpAtk, base_sp_def AS baseSpDef, base_speed AS baseSpeed
     FROM pokemon WHERE name_en = ?`).get(n) as any;
  const allMoves = db.prepare('SELECT id, name_en AS nameEn FROM moves').all() as any[];
  const movesById = new Map(allMoves.map(m => [m.id, m as any]));

  for (const [key, pair] of Object.entries<any>(golden)) {
    if (key.startsWith('_')) continue;
    it(`${key}: full team reconstructed (lang=${pair.lang})`, async () => {
      const vocab = buildVocabNode();
      const team = pair.team.map((t: any) => pokemonByName(t.species));
      const legalIds = new Set<number>(team.map((p: any) => p.id));
      const basesById = new Map(team.map((p: any) => [p.id, p]));

      const movesScan = await scanPlayerImage(loadPng(`${GOLDEN_DIR}/${pair.movesImage}`), legalIds, vocab, nodeScanDeps);
      const statsScan = await scanPlayerImage(loadPng(`${GOLDEN_DIR}/${pair.statsImage}`), legalIds, vocab, nodeScanDeps);
      expect(movesScan?.kind).toBe('moves');
      expect(statsScan?.kind).toBe('stats');

      const merged = mergePlayerScan(movesScan as any, statsScan as any, basesById);
      expect(merged.lang).toBe(pair.lang);
      const configs = buildConfigs(merged, basesById, movesById as any, vocab);
      expect(configs).toHaveLength(6);

      configs.forEach((cfg, i) => {
        const want = pair.team[i];
        expect(cfg.selectedId, `slot ${i + 1} species`).toBe(pokemonByName(want.species).id);
        expect(cfg.activeAbility, `slot ${i + 1} ability`).toBe(want.ability);
        expect(cfg.item, `slot ${i + 1} item`).toBe(want.item);
        expect(cfg.moves.filter(Boolean).map((m: any) => m.nameEn), `slot ${i + 1} moves`).toEqual(want.moves);
        expect([cfg.spHp, cfg.spAtk, cfg.spDef, cfg.spSpa, cfg.spSpd, cfg.spSpe]).toEqual(want.sp);
        expect(cfg.nature).toBe(getFormattedNature(want.nature));
        const ns = getNatureStats(want.nature);
        expect(cfg.boostedStat).toBe(ns.boostedStat);
        expect(cfg.hinderedStat).toBe(ns.hinderedStat);
      });
    }, 600_000);
  }
});
```

- [ ] **Step 3: Run and close the loop**

Run: `npx vitest run scripts/player-scan-accuracy.test.ts`
Expected: PASS for `en-rental` and `zh-team17`. Any failure traces to a specific earlier module (panel crop → Task 3 constants; digit → Task 4; text → Task 5 tuning; merge → Task 8) — fix there, keeping that module's own tests green.

Known data gap: Champions learnsets can differ from PokeAPI's `pokemon_moves` (Champions adds moves). If a golden move can't match because it's absent from the learnset table, add the missing `(pokemon_id, move_id)` rows with a one-off patch script (`scripts/patch_champions_learnsets.py`, plain `INSERT OR IGNORE` of the named pairs), re-run `cp vgc_pokemon.db public/vgc_pokemon.db`, and commit both DB copies with the script.

- [ ] **Step 4: Full suite + commit**

```bash
npx vitest run && npx tsc --noEmit
git add scripts/player-scan-accuracy.test.ts training/player-golden.json
git commit -m "test(scan): end-to-end player team scan golden coverage (en + zh-Hant)"
```

- [ ] **Step 5: Report residual gaps**

JA and zh-Hans have no golden screenshots yet. State this plainly in the final report: the language plumbing is tested (Task 5 round-trips, Task 6 vocab), but real-screenshot accuracy for ja/zh-Hans is unverified until the user supplies captures — ask for one pair each when available.
