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
    # 2.1 Fetch CSVs
    pokemon_df = fetch_csv("pokemon.csv")
    pokemon_species_df = fetch_csv("pokemon_species.csv")
    pokemon_species_names_df = fetch_csv("pokemon_species_names.csv")
    pokemon_types_df = fetch_csv("pokemon_types.csv")
    types_df = fetch_csv("types.csv")
    pokemon_stats_df = fetch_csv("pokemon_stats.csv")
    pokemon_forms_df = fetch_csv("pokemon_forms.csv")

    # 2.2 Localized names
    # local_language_id: 9 (en), 1 (ja-Hrkt), 4 (zh-Hant)
    names_en = pokemon_species_names_df[pokemon_species_names_df['local_language_id'] == 9][['pokemon_species_id', 'name']].rename(columns={'name': 'name_en'})
    names_ja = pokemon_species_names_df[pokemon_species_names_df['local_language_id'] == 1][['pokemon_species_id', 'name']].rename(columns={'name': 'name_ja'})
    names_zh = pokemon_species_names_df[pokemon_species_names_df['local_language_id'] == 4][['pokemon_species_id', 'name']].rename(columns={'name': 'name_zh'})

    # Merge names together
    names_df = names_en.merge(names_ja, on='pokemon_species_id', how='left').merge(names_zh, on='pokemon_species_id', how='left')

    # Merge pokemon with species
    pokemon_merged = pokemon_df.merge(pokemon_species_df[['id', 'identifier']], left_on='species_id', right_on='id', suffixes=('', '_species'), how='left')
    
    # Merge with names
    pokemon_merged = pokemon_merged.merge(names_df, left_on='species_id', right_on='pokemon_species_id', how='left')

    # 2.3 Pivot stats
    # Stat IDs: 1 (hp), 2 (atk), 3 (def), 4 (spa), 5 (spd), 6 (spe)
    stat_mapping = {1: 'hp', 2: 'atk', 3: 'def', 4: 'spa', 5: 'spd', 6: 'spe'}
    pokemon_stats_df['stat_name'] = pokemon_stats_df['stat_id'].map(stat_mapping)
    
    # Drop rows with unmapped stats (if any new ones exist) and pivot
    pokemon_stats_df = pokemon_stats_df.dropna(subset=['stat_name'])
    stats_pivot = pokemon_stats_df.pivot(index='pokemon_id', columns='stat_name', values='base_stat').reset_index()

    # Merge stats into pokemon
    pokemon_merged = pokemon_merged.merge(stats_pivot, left_on='id', right_on='pokemon_id', how='left')

    # 2.4 Process types
    pt_merged = pokemon_types_df.merge(types_df[['id', 'identifier']], left_on='type_id', right_on='id', how='left')
    
    type1 = pt_merged[pt_merged['slot'] == 1][['pokemon_id', 'identifier']].rename(columns={'identifier': 'type1'})
    type2 = pt_merged[pt_merged['slot'] == 2][['pokemon_id', 'identifier']].rename(columns={'identifier': 'type2'})

    types_pivot = type1.merge(type2, on='pokemon_id', how='left')

    # Merge types into pokemon
    pokemon_merged = pokemon_merged.merge(types_pivot, left_on='id', right_on='pokemon_id', how='left')
    
    # Final data selection
    final_df = pokemon_merged[[
        'id', 'identifier', 'name_en', 'name_ja', 'name_zh',
        'type1', 'type2',
        'hp', 'atk', 'def', 'spa', 'spd', 'spe',
        'height', 'weight', 'base_experience', 'order', 'is_default'
    ]].copy()

    # Database Creation (3.1, 3.2, 3.3)
    db_path = "vgc_pokemon.db"
    
    # If the db exists, we connect to it to avoid overwriting existing non-pokemon tables (like moves/abilities from a previous spec)
    # But since we're recreating the `pokemon` table, we'll drop it if it exists.
    conn = sqlite3.connect(db_path)
    
    print(f"Writing to SQLite database {db_path}...")
    
    conn.execute("DROP TABLE IF EXISTS pokemon;")
    conn.execute("DROP TABLE IF EXISTS pokemon_forms;")
    conn.execute("DROP TABLE IF EXISTS types;")
    
    create_table_sql = """
    CREATE TABLE pokemon (
        id INTEGER PRIMARY KEY,
        identifier TEXT NOT NULL,
        name_en TEXT,
        name_ja TEXT,
        name_zh TEXT,
        type1 TEXT NOT NULL,
        type2 TEXT,
        hp INTEGER NOT NULL,
        atk INTEGER NOT NULL,
        def INTEGER NOT NULL,
        spa INTEGER NOT NULL,
        spd INTEGER NOT NULL,
        spe INTEGER NOT NULL,
        height INTEGER,
        weight INTEGER,
        base_experience INTEGER,
        "order" INTEGER,
        is_default BOOLEAN
    );
    """
    
    conn.execute(create_table_sql)
    
    # Insert data
    final_df.to_sql('pokemon', conn, if_exists='append', index=False)
    
    # Create secondary tables
    pokemon_forms_df.to_sql('pokemon_forms', conn, if_exists='replace', index=False)
    types_df.to_sql('types', conn, if_exists='replace', index=False)
    
    conn.commit()
    conn.close()
    print("Data extraction and insertion complete!")

if __name__ == "__main__":
    main()
