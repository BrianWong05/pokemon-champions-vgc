export interface SavedBuild {
  nature: string;
  ability: string | null;
  item: string | null;
  sp: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
}

const KEY = 'champvgc.savedBuilds';

function readAll(): Record<string, SavedBuild> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, SavedBuild>) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, SavedBuild>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable (private mode / SSR) — silently skip */
  }
}

export function loadSavedBuild(species: string): SavedBuild | null {
  return readAll()[species] ?? null;
}

export function saveBuild(species: string, build: SavedBuild): void {
  const all = readAll();
  all[species] = build;
  writeAll(all);
}

export function clearBuild(species: string): void {
  const all = readAll();
  delete all[species];
  writeAll(all);
}
