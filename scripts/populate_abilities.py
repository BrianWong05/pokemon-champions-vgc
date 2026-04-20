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
    abilities_df = fetch_csv("abilities.csv")
    ability_names_df = fetch_csv("ability_names.csv")
    pokemon_abilities_df = fetch_csv("pokemon_abilities.csv")
    
    # 2. Connect to Database
    db_path = "vgc_pokemon.db"
    if not os.path.exists(db_path):
        print(f"Error: Database {db_path} not found.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get existing pokemon IDs to filter
    cursor.execute("SELECT id FROM pokemon")
    existing_pokemon_ids = [row[0] for row in cursor.fetchall()]
    print(f"Filtering for {len(existing_pokemon_ids)} existing Pokémon in database...")

    print("Processing localized names...")
    # languages: 9 (En), 11 (Ja), 4 (Zh-Hant)
    names_en = ability_names_df[ability_names_df['local_language_id'] == 9][['ability_id', 'name']].rename(columns={'name': 'name_en'})
    names_ja = ability_names_df[ability_names_df['local_language_id'] == 11][['ability_id', 'name']].rename(columns={'name': 'name_ja'})
    names_zh = ability_names_df[ability_names_df['local_language_id'] == 4][['ability_id', 'name']].rename(columns={'name': 'name_zh'})

    # Merge names
    names_merged = names_en.merge(names_ja, on='ability_id', how='left').merge(names_zh, on='ability_id', how='left')

    # Merge with base ability data
    final_abilities_df = abilities_df.merge(names_merged, left_on='id', right_on='ability_id', how='left')
    
    # Select columns matching schema.ts
    # id, identifier, name_en, name_ja, name_zh
    final_abilities_df = final_abilities_df[[
        'id', 'identifier', 'name_en', 'name_ja', 'name_zh'
    ]].fillna({'name_en': 'Unknown'})

    print("Filtering pokemon abilities...")
    vgc_pokemon_abilities_df = pokemon_abilities_df[
        pokemon_abilities_df['pokemon_id'].isin(existing_pokemon_ids)
    ][['pokemon_id', 'ability_id', 'is_hidden', 'slot']].drop_duplicates()

    print(f"Inserting abilities into {db_path}...")
    
    # Insert abilities
    abilities_records = final_abilities_df.to_records(index=False).tolist()
    cursor.executemany("""
        INSERT OR REPLACE INTO abilities 
        (id, identifier, name_en, name_ja, name_zh) 
        VALUES (?, ?, ?, ?, ?)
    """, abilities_records)
    
    print(f"Successfully inserted/updated {cursor.rowcount} abilities.")

    # Insert pokemon_abilities
    pa_records = vgc_pokemon_abilities_df.to_records(index=False).tolist()
    cursor.executemany("""
        INSERT OR IGNORE INTO pokemon_abilities 
        (pokemon_id, ability_id, is_hidden, slot) 
        VALUES (?, ?, ?, ?)
    """, pa_records)
    
    print(f"Successfully linked {cursor.rowcount} pokemon-ability associations.")

    conn.commit()
    conn.close()
    
    print("Done!")

if __name__ == "__main__":
    main()
