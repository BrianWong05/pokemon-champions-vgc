import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';
// @ts-ignore
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import * as schema from '@/db/schema';

// We'll use a promise to ensure the database is only initialized once
let dbPromise: Promise<ReturnType<typeof drizzle<typeof schema>>> | null = null;

export const initDb = async () => {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    // 1. Initialize SQL.js
    const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
      ? import.meta.env.BASE_URL 
      : `${import.meta.env.BASE_URL}/`;

    const SQL = await initSqlJs({
      locateFile: file => file.endsWith('.wasm') ? wasmUrl : `${baseUrl}${file}`
    });

    // 2. Fetch the database file from the public directory
    const response = await fetch(`${baseUrl}vgc_pokemon.db`);
    if (!response.ok) {
      throw new Error(`Failed to fetch database from ${baseUrl}vgc_pokemon.db: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 3. Create the database
    const sqljsDb = new SQL.Database(uint8Array);

    // 4. Wrap with Drizzle
    return drizzle(sqljsDb, { schema });
  })();

  return dbPromise;
};

// For convenience, but note that it might be null initially
export let db: ReturnType<typeof drizzle<typeof schema>>;

// Helper to initialize and set the global db variable
export const getDb = async () => {
  if (!db) {
    db = await initDb();
  }
  return db;
};
