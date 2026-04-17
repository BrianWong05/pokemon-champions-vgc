import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { pokemon, pokemonForms, types } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const sqlite = new Database('vgc_pokemon.db');
const db = drizzle(sqlite);

async function test() {
  console.log("--- Testing Pokemon Localized Names ---");
  const p = await db.select().from(pokemon).where(eq(pokemon.identifier, 'bulbasaur')).get();
  console.log("Bulbasaur:", p);

  console.log("\n--- Testing Types ---");
  const t = await db.select().from(types).limit(5).all();
  console.log("Types (first 5):", t);

  console.log("\n--- Testing Forms ---");
  const f = await db.select().from(pokemonForms).limit(5).all();
  console.log("Forms (first 5):", f);
}

test();
