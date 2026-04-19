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

def main():
    # 1. Fetch CSVs
    moves_df = fetch_csv("moves.csv")
    move_names_df = fetch_csv("move_names.csv")
    pokemon_moves_df = fetch_csv("pokemon_moves.csv")
    
    print("Processing localized names...")
    # languages: 9 (En), 11 (Ja), 4 (Zh-Hant)
    # Note: Using 11 for Ja (Hrkt) as it's common for moves, or 1 if it's Hrkt-specific
    names_en = move_names_df[move_names_df['local_language_id'] == 9][['move_id', 'name']].rename(columns={'name': 'name_en'})
    names_ja = move_names_df[move_names_df['local_language_id'] == 1][['move_id', 'name']].rename(columns={'name': 'name_ja'})
    names_zh = move_names_df[move_names_df['local_language_id'] == 4][['move_id', 'name']].rename(columns={'name': 'name_zh'})

    # Merge names
    names_merged = names_en.merge(names_ja, on='move_id', how='left').merge(names_zh, on='move_id', how='left')

    # Merge with base move data
    # moves.csv columns: id, identifier, generation_id, type_id, power, pp, accuracy, priority, target_id, damage_class_id, effect_id, effect_chance, contest_type_id, contest_effect_id, super_contest_effect_id
    final_moves_df = moves_df.merge(names_merged, left_on='id', right_on='move_id', how='left')
    
    # Select columns matching schema.ts
    # id, identifier, nameEn, nameJa, nameZh, typeId, damageClassId, power, accuracy, pp, priority
    final_moves_df = final_moves_df[[
        'id', 'identifier', 'name_en', 'name_ja', 'name_zh', 
        'type_id', 'damage_class_id', 'power', 'accuracy', 'pp', 'priority'
    ]].fillna({'name_en': 'Unknown'})

    print("Filtering pokemon moves (Level-up, Machine, Tutor)...")
    # learn_method_id: 1 (level-up), 3 (tutor), 4 (machine)
    # version_group_id: 20 (SV) or later
    vgc_moves_df = pokemon_moves_df[
        (pokemon_moves_df['pokemon_move_method_id'].isin([1, 3, 4])) &
        (pokemon_moves_df['version_group_id'] >= 20)
    ][['pokemon_id', 'move_id']].drop_duplicates()

    # 2. Database Insertion
    db_path = "vgc_pokemon.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"Inserting data into {db_path}...")
    
    # Insert moves
    moves_records = final_moves_df.to_records(index=False).tolist()
    cursor.executemany("""
        INSERT OR REPLACE INTO moves 
        (id, identifier, name_en, name_ja, name_zh, type_id, damage_class_id, power, accuracy, pp, priority) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, moves_records)
    
    print(f"Successfully inserted/updated {cursor.rowcount} moves.")

    # Insert pokemon_moves
    pm_records = vgc_moves_df.to_records(index=False).tolist()
    cursor.executemany("INSERT OR IGNORE INTO pokemon_moves (pokemon_id, move_id) VALUES (?, ?)", pm_records)
    
    print(f"Successfully linked {cursor.rowcount} pokemon-move associations.")

    conn.commit()
    conn.close()
    
    print("Done!")

if __name__ == "__main__":
    main()
