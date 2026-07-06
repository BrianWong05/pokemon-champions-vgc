import sqlite3

# Champions learnsets that differ from PokeAPI's SV data (confirmed missing by
# scripts/verify-player-golden.test.ts console.warn output against training/player-golden.json).
PATCHES = [
    ("Grimmsnarl", "Parting Shot"),
    ("Swampert", "Wave Crash"),
    ("Pelipper", "Wide Guard"),
]

def main():
    db_path = "vgc_pokemon.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    for pokemon_name, move_name in PATCHES:
        pokemon_row = cursor.execute(
            "SELECT id FROM pokemon WHERE name_en = ?", (pokemon_name,)
        ).fetchone()
        move_row = cursor.execute(
            "SELECT id FROM moves WHERE name_en = ?", (move_name,)
        ).fetchone()
        if not pokemon_row or not move_row:
            print(f"SKIP {pokemon_name} -> {move_name}: not found in DB")
            continue
        cursor.execute(
            "INSERT OR IGNORE INTO pokemon_moves (pokemon_id, move_id) VALUES (?, ?)",
            (pokemon_row[0], move_row[0]),
        )
        print(f"Patched {pokemon_name} -> {move_name}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()
