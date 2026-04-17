import pandas as pd
import requests
import sqlite3
import os
import io
import re

BASE_URL = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"

# 1.1 Form Localization Mapping
FORM_MAPPINGS = {
    "mega": {
        "en": "Mega {name}",
        "ja": "メガ{name}",
        "zh": "超級{name}"
    },
    "alola": {
        "en": "Alolan {name}",
        "ja": "アローラ{name}",
        "zh": "阿羅拉的樣子 {name}"
    },
    "galar": {
        "en": "Galarian {name}",
        "ja": "ガラル{name}",
        "zh": "伽勒爾的樣子 {name}"
    },
    "hisui": {
        "en": "Hisuian {name}",
        "ja": "ヒスイ{name}",
        "zh": "洗翠的樣子 {name}"
    },
    "paldea": {
        "en": "Paldean {name}",
        "ja": "パルデア{name}",
        "zh": "帕底亞的樣子 {name}"
    },
    "mega-x": {
        "en": "Mega {name} X",
        "ja": "メガ{name}X",
        "zh": "超級{name}X"
    },
    "mega-y": {
        "en": "Mega {name} Y",
        "ja": "メガ{name}Y",
        "zh": "超級{name}Y"
    }
}

# 1.2 Implement localize_form_name function
def localize_form_name(row, lang):
    identifier = row['identifier']
    base_name = row[f'name_{lang}']
    is_default = row['is_default']
    
    # If it's a default form and doesn't have a known suffix, return base name
    if is_default and '-' not in identifier:
        return base_name

    # Extract suffix (e.g., charizard-mega-x -> mega-x)
    parts = identifier.split('-', 1)
    if len(parts) < 2:
        return base_name
        
    suffix = parts[1]
    
    # Check for direct mapping
    if suffix in FORM_MAPPINGS:
        mapping = FORM_MAPPINGS[suffix]
        return mapping[lang].format(name=base_name)
    
    # Check for partial matches (e.g., "mega-x" might be split or handled differently)
    # This covers cases where the identifier might be "name-form-something-else"
    for key, mapping in FORM_MAPPINGS.items():
        if identifier.endswith(f"-{key}"):
            return mapping[lang].format(name=base_name)

    return base_name

def fetch_csv(filename):
    print(f"Fetching {filename}...")
    url = f"{BASE_URL}{filename}"
    response = requests.get(url)
    response.raise_for_status()
    return pd.read_csv(io.StringIO(response.text))

def main():
    # Fetch CSVs
    pokemon_df = fetch_csv("pokemon.csv")
    pokemon_species_df = fetch_csv("pokemon_species.csv")
    pokemon_species_names_df = fetch_csv("pokemon_species_names.csv")
    pokemon_types_df = fetch_csv("pokemon_types.csv")
    types_df = fetch_csv("types.csv")
    pokemon_stats_df = fetch_csv("pokemon_stats.csv")
    pokemon_forms_df = fetch_csv("pokemon_forms.csv")

    # Localized names
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

    # 1.3 & 1.4 Integrate and apply localization function
    print("Constructing localized names for alternate forms...")
    pokemon_merged['name_en'] = pokemon_merged.apply(lambda row: localize_form_name(row, 'en'), axis=1)
    pokemon_merged['name_ja'] = pokemon_merged.apply(lambda row: localize_form_name(row, 'ja'), axis=1)
    pokemon_merged['name_zh'] = pokemon_merged.apply(lambda row: localize_form_name(row, 'zh'), axis=1)

    # Pivot stats
    stat_mapping = {1: 'base_hp', 2: 'base_attack', 3: 'base_defense', 4: 'base_sp_atk', 5: 'base_sp_def', 6: 'base_speed'}
    pokemon_stats_df['stat_name'] = pokemon_stats_df['stat_id'].map(stat_mapping)
    pokemon_stats_df = pokemon_stats_df.dropna(subset=['stat_name'])
    stats_pivot = pokemon_stats_df.pivot(index='pokemon_id', columns='stat_name', values='base_stat').reset_index()

    # Merge stats into pokemon
    pokemon_merged = pokemon_merged.merge(stats_pivot, left_on='id', right_on='pokemon_id', how='left')

    # Process types
    pt_merged = pokemon_types_df.merge(types_df[['id', 'identifier']], left_on='type_id', right_on='id', how='left')
    type1 = pt_merged[pt_merged['slot'] == 1][['pokemon_id', 'identifier']].rename(columns={'identifier': 'type1'})
    type2 = pt_merged[pt_merged['slot'] == 2][['pokemon_id', 'identifier']].rename(columns={'identifier': 'type2'})
    types_pivot = type1.merge(type2, on='pokemon_id', how='left')
    pokemon_merged = pokemon_merged.merge(types_pivot, left_on='id', right_on='pokemon_id', how='left')
    
    # Final data selection
    final_df = pokemon_merged[[
        'id', 'identifier', 'name_en', 'name_ja', 'name_zh',
        'type1', 'type2',
        'base_hp', 'base_attack', 'base_defense', 'base_sp_atk', 'base_sp_def', 'base_speed',
        'height', 'weight', 'base_experience', 'order', 'is_default'
    ]].copy()

    # Database Creation
    db_path = "vgc_pokemon.db"
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
        base_hp INTEGER NOT NULL,
        base_attack INTEGER NOT NULL,
        base_defense INTEGER NOT NULL,
        base_sp_atk INTEGER NOT NULL,
        base_sp_def INTEGER NOT NULL,
        base_speed INTEGER NOT NULL,
        height INTEGER,
        weight INTEGER,
        base_experience INTEGER,
        "order" INTEGER,
        is_default BOOLEAN
    );
    """
    conn.execute(create_table_sql)
    final_df.to_sql('pokemon', conn, if_exists='append', index=False)
    pokemon_forms_df.to_sql('pokemon_forms', conn, if_exists='replace', index=False)
    types_df.to_sql('types', conn, if_exists='replace', index=False)
    
    conn.commit()
    conn.close()
    print("Data extraction and insertion complete!")

if __name__ == "__main__":
    main()
