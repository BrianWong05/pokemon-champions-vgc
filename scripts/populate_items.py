import pandas as pd
import requests
import sqlite3
import os
import io

BASE_URL = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"

def fetch_csv(filename):
    print(f"Fetching {filename}...")
    url = f"{BASE_URL}{filename}"
    response = requests.get(url)
    response.raise_for_status()
    return pd.read_csv(io.StringIO(response.text))

def lang(df, lid, col):
    d = df[df.local_language_id == lid][["item_id", "name"]].rename(columns={"name": col})
    return d

# Champions-only mega stones: not in PokeAPI. Synthesize zh names as "<species zh>進化石"
# (official Champions naming, e.g. 快龍進化石) by longest-common-prefix species match.
MEGA_STONES = [  # keep in sync with src/features/pokemon/utils/items.ts MEGA_STONES
    "Abomasite","Absolite","Absolite Z","Aerodactylite","Aggronite","Alakazite","Altarianite","Ampharosite",
    "Audinite","Banettite","Barbaracite","Baxcalibrite","Beedrillite","Blastoisinite","Cameruptite","Chandelurite",
    "Charizardite X","Charizardite Y","Chesnaughtite","Chimechite","Clefablite","Crabominite",
    "Darkranite","Delphoxite","Dragalgite","Dragoninite","Drampanite","Eelektrossite","Emboarite","Excadrite","Falinksite","Feraligite","Floettite",
    "Froslassite","Galladite","Garchompite","Garchompite Z","Gardevoirite","Gengarite","Glalitite","Glimmoranite",
    "Golisopite","Golurkite","Greninjite","Gyaradosite","Hawluchanite","Heatranite","Heracronite","Houndoominite",
    "Kangaskhanite","Lopunnite","Lucarionite","Lucarionite Z","Magearnite","Malamarite","Manectite","Medichamite","Meganiumite",
    "Meowsticite","Pidgeotite","Pinsirite","Pyroarite","Raichunite X","Raichunite Y","Sablenite","Scizorite","Scolipite","Scovillainite","Scraftinite","Sharpedonite",
    "Skarmorite","Slowbronite","Staraptite","Starminite","Steelixite","Tatsugirinite","Tyranitarite","Venusaurite","Victreebelite",
    "Zeraorite","Zygardite",
]
# The MEGA_STONES list above is the full 92-stone Legends Z-A / Champions set, every name verified
# against Bulbapedia (the same source download_mega_stone.py scrapes). A few en/ja/zh fields are
# also confirmed on-screen in training/player-screens/: Barbaracite en (en-rental-43et-moves.png),
# Raichunite Y ja (ja-team7-moves.png), Dragalgite zh (zh-team3-moves.png). The "... Z" stones are
# the Mega Z forms of Absol/Garchomp/Lucario (full-width Ｚ suffix, like the X/Y stones).
MANUAL_SPECIES = {"Dragoninite": "Dragonite", "Chimechite": "Chimecho", "Scraftinite": "Scrafty"}  # extend if prefix match misfires

# name_ja synthesis for Champions-only stones: <species name_ja> + "ナイト", eliding
# one "ナ" when the species name already ends in "ナ" (フシギバナ -> フシギバナイト,
# confirmed against the existing Venusaurite row). MANUAL_JA overrides names the ナ-only
# heuristic can't express -- several Z-A stones drop the species' final mora before ナイト
# (Bulbapedia; same rule as the in-table リザードン->リザードナイト / ミュウツー->ミュウツナイト):
#   ドラミドロ->ドラミド, ペンドラー->ペンドラ, シビルドン->シビルド, カラマネロ->カラマネ,
#   ズルズキン->ズルズキ (Scraftinite), ヒードラン->ヒードラ (Heatranite).
MANUAL_JA = {
    "Meowsticite": "ニャオニクスナイト", "Delphoxite": "マフォクシナイト", "Dragalgite": "ドラミドナイト",
    "Scolipite": "ペンドラナイト", "Eelektrossite": "シビルドナイト", "Malamarite": "カラマネナイト",
    "Scraftinite": "ズルズキナイト", "Heatranite": "ヒードラナイト",
}

def synthesize_ja(species_ja):
    if not species_ja:
        return None
    return species_ja[:-1] + "ナイト" if species_ja.endswith("ナ") else species_ja + "ナイト"

def strip_form_suffix(name):
    # Form/gender species rows carry a trailing parenthetical in every name field
    # (Pyroar "(Male)", Tatsugiri "(Curly)", Zygarde "(50)", Absol "(Mega Z)", ...);
    # drop it before synthesizing the stone name.
    if name and name.endswith(")") and " (" in name:
        return name[: name.rfind(" (")]
    return name

def species_for(stone, pokemon):
    base = stone.replace(" X", "").replace(" Y", "").replace(" Z", "")
    if stone in MANUAL_SPECIES:
        return MANUAL_SPECIES[stone]
    best, best_len = None, 0
    for name in pokemon.name_en:
        n = 0
        while n < min(len(name), len(base)) and name[n].lower() == base[n].lower():
            n += 1
        if n > best_len:
            best, best_len = name, n
    return best if best_len >= 4 else None

def main():
    # 1. Fetch CSVs
    items_df = fetch_csv("items.csv")
    item_names_df = fetch_csv("item_names.csv")

    # 2. Connect to Database
    db_path = "vgc_pokemon.db"
    if not os.path.exists(db_path):
        print(f"Error: Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY, identifier TEXT NOT NULL, name_en TEXT,
        name_ja TEXT, name_zh TEXT, name_zh_hans TEXT)""")

    print("Processing localized names...")
    # languages: 9 (En), 1 (Ja-Hrkt), 11 (Ja), 4 (Zh-Hant), 12 (Zh-Hans)
    merged = items_df[["id", "identifier"]]
    for lid, col in [(9, "name_en"), (1, "name_ja"), (4, "name_zh"), (12, "name_zh_hans")]:
        merged = merged.merge(lang(item_names_df, lid, col), left_on="id", right_on="item_id", how="left").drop(columns=["item_id"])
    # ja fallback: some items only have language 11
    ja11 = lang(item_names_df, 11, "name_ja11")
    merged = merged.merge(ja11, left_on="id", right_on="item_id", how="left").drop(columns=["item_id"])
    merged["name_ja"] = merged["name_ja"].fillna(merged["name_ja11"])
    merged = merged.drop(columns=["name_ja11"])

    print(f"Inserting items into {db_path}...")
    item_records = merged[["id", "identifier", "name_en", "name_ja", "name_zh", "name_zh_hans"]].to_records(index=False).tolist()
    cursor.executemany("""
        INSERT OR REPLACE INTO items
        (id, identifier, name_en, name_ja, name_zh, name_zh_hans)
        VALUES (?, ?, ?, ?, ?, ?)
    """, item_records)

    print(f"Successfully inserted/updated {len(item_records)} items.")

    # Champions-only mega stones (not in PokeAPI)
    pokemon = pd.read_sql("SELECT name_en, name_ja, name_zh FROM pokemon WHERE name_en IS NOT NULL", conn)
    # PokeAPI-sourced rows (id < 100000) are "classic, skip". Champions-only rows
    # (id >= 100000) may already exist from a prior run of this script -- reuse
    # their id so re-running re-synthesizes fields (e.g. backfilling name_ja)
    # in place instead of colliding with a freshly-allocated id.
    classic = {r[0] for r in cursor.execute("SELECT name_en FROM items WHERE id < 100000").fetchall()}
    existing_ids = dict(cursor.execute("SELECT name_en, id FROM items WHERE id >= 100000").fetchall())
    next_id = (max(existing_ids.values()) + 1) if existing_ids else 100000

    mega_records = []
    for stone in MEGA_STONES:
        if stone in classic:
            continue  # classic stones came from PokeAPI
        sp = species_for(stone, pokemon)
        row = pokemon[pokemon.name_en == sp].iloc[0] if sp is not None and (pokemon.name_en == sp).any() else None
        # ja/zh append a full-width Ｘ/Ｙ/Ｚ with no space, matching the PokeAPI classic rows
        # already in this table (リザードナイトＹ / 噴火龍進化石Ｙ) and Bulbapedia (ライチュウナイトＹ,
        # アブソルナイトＺ). Only name_en keeps the ASCII spaced "... Y" form (matches Charizardite Y).
        suffix = ("Ｘ" if stone.endswith(" X") else "Ｙ" if stone.endswith(" Y")
                  else "Ｚ" if stone.endswith(" Z") else "")
        zh = (strip_form_suffix(str(row.name_zh)) + "進化石" + suffix) if row is not None and pd.notna(row.name_zh) else None
        zh_hans = None  # zh-Hant name is char-convertible if needed later; matching falls back to en
        ja = MANUAL_JA.get(stone) or (synthesize_ja(strip_form_suffix(row.name_ja)) + suffix if row is not None and pd.notna(row.name_ja) else None)
        if stone in existing_ids:
            item_id = existing_ids[stone]
        else:
            item_id = next_id
            next_id += 1
        mega_records.append((item_id, stone.lower().replace(" ", "-"), stone, ja, zh, zh_hans))

    cursor.executemany("""
        INSERT OR REPLACE INTO items
        (id, identifier, name_en, name_ja, name_zh, name_zh_hans)
        VALUES (?, ?, ?, ?, ?, ?)
    """, mega_records)

    print(f"Successfully inserted/updated {len(mega_records)} Champions-only mega stones.")

    # Drop stale Champions rows no longer in MEGA_STONES (e.g. a renamed stone like
    # Scraftite -> Scraftinite) so re-runs don't leave orphans behind.
    placeholders = ",".join("?" * len(MEGA_STONES))
    cursor.execute(f"DELETE FROM items WHERE id >= 100000 AND name_en NOT IN ({placeholders})", MEGA_STONES)
    if cursor.rowcount:
        print(f"Removed {cursor.rowcount} stale Champions stone row(s).")

    conn.commit()

    total = cursor.execute("SELECT COUNT(*) FROM items").fetchone()[0]
    conn.close()

    print(f"Done! {total} items total.")

if __name__ == "__main__":
    main()
