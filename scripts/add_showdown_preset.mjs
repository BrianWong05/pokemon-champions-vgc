import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRESETS_FILE = path.join(__dirname, '../src/utils/pokemon-presets.ts');

function calculateSP(ev) {
  if (ev === undefined || ev === null) return 0;
  return Math.floor((ev + 4) / 8);
}

function parseShowdown(text) {
  const lines = text.trim().split('\n').map(l => l.trim());
  if (lines.length === 0) return null;

  // 1. Parse name and item
  let firstLine = lines[0];
  let pokemonName = '';
  let item = '';
  
  if (firstLine.includes(' @ ')) {
    const parts = firstLine.split(' @ ');
    item = parts[1].trim();
    firstLine = parts[0].trim();
  } else {
    firstLine = firstLine.trim();
  }

  // Remove gender e.g., (M) or (F)
  pokemonName = firstLine.replace(/\s*\([MF]\)\s*/g, '').trim();

  let ability = '';
  let nature = 'Serious';
  const evs = { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 };
  const moves = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('Ability: ')) {
      ability = line.replace('Ability: ', '').trim();
    } else if (line.startsWith('EVs: ')) {
      const evParts = line.replace('EVs: ', '').split(' / ');
      for (const part of evParts) {
        const [val, stat] = part.trim().split(' ');
        if (val && stat) {
          // Normalize stat names if needed
          let normStat = stat;
          if (stat.toLowerCase() === 'hp') normStat = 'HP';
          else if (stat.toLowerCase() === 'atk') normStat = 'Atk';
          else if (stat.toLowerCase() === 'def') normStat = 'Def';
          else if (stat.toLowerCase() === 'spa') normStat = 'SpA';
          else if (stat.toLowerCase() === 'spd') normStat = 'SpD';
          else if (stat.toLowerCase() === 'spe') normStat = 'Spe';
          evs[normStat] = parseInt(val, 10);
        }
      }
    } else if (line.endsWith(' Nature')) {
      nature = line.replace(' Nature', '').trim();
    } else if (line.startsWith('- ')) {
      moves.push(line.replace('- ', '').trim());
    }
  }

  const evValues = Object.values(evs);
  const maxVal = Math.max(...evValues);
  const totalVal = evValues.reduce((a, b) => a + b, 0);

  // Heuristic: If all values are <= 32 and total is <= 66, assume they are already SP.
  // Standard Showdown EVs go up to 252. If we see 32, it could be 32 EVs or 32 SP.
  // But if the user says they are pasting SP values, we should honor that.
  const isAlreadySP = maxVal <= 32 && totalVal <= 66;

  const sp = {
    hp: isAlreadySP ? evs.HP : calculateSP(evs.HP),
    atk: isAlreadySP ? evs.Atk : calculateSP(evs.Atk),
    def: isAlreadySP ? evs.Def : calculateSP(evs.Def),
    spa: isAlreadySP ? evs.SpA : calculateSP(evs.SpA),
    spd: isAlreadySP ? evs.SpD : calculateSP(evs.SpD),
    spe: isAlreadySP ? evs.Spe : calculateSP(evs.Spe),
  };

  const id = `${pokemonName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item ? item.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'preset'}`;
  const name = `${pokemonName}${item ? ` (${item})` : ''}`;

  return {
    id,
    name,
    pokemonName,
    item,
    ability,
    nature,
    sp,
    moves
  };
}

let input = '';
const filePath = process.argv[2];

if (filePath && fs.existsSync(filePath)) {
  input = fs.readFileSync(filePath, 'utf-8');
} else {
  // Check if stdin has data (is not a TTY)
  if (!process.stdin.isTTY) {
    input = fs.readFileSync(0, 'utf-8');
  }
}

if (!input || !input.trim()) {
  console.error("Error: Please provide Showdown format via stdin or a file path.");
  console.error("Usage:");
  console.error("  node scripts/add_showdown_preset.mjs path/to/preset.txt");
  console.error("  pbpaste | node scripts/add_showdown_preset.mjs");
  process.exit(1);
}

const blocks = input.split(/\n\s*\n/);
const presets = [];

for (const block of blocks) {
  if (!block.trim()) continue;
  const p = parseShowdown(block);
  if (p) presets.push(p);
}

if (presets.length === 0) {
  console.error("Error: Failed to parse any Pokemon from the provided input.");
  process.exit(1);
}

if (!fs.existsSync(PRESETS_FILE)) {
  console.error(`Error: Could not find ${PRESETS_FILE}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(PRESETS_FILE, 'utf-8');
const exportRegex = /export const POKEMON_PRESETS:\s*PokemonPreset\[\]\s*=\s*\[([\s\S]*?)\];/;

const match = fileContent.match(exportRegex);
if (match) {
  const currentListText = match[1];
  
  // Parse existing presets to check for duplicates
  let existingPresets = [];
  try {
    // Basic cleanup to help parsing if needed, but new Function should handle standard JS objects
    existingPresets = new Function(`return [${currentListText}]`)();
  } catch (e) {
    console.warn("Warning: Could not parse existing presets for deduplication check. Proceeding with caution.");
  }

  const arePresetsEqual = (p1, p2) => {
    return p1.pokemonName === p2.pokemonName &&
           p1.nature === p2.nature &&
           p1.ability === p2.ability &&
           p1.item === p2.item &&
           p1.sp.hp === p2.sp.hp &&
           p1.sp.atk === p2.sp.atk &&
           p1.sp.def === p2.sp.def &&
           p1.sp.spa === p2.sp.spa &&
           p1.sp.spd === p2.sp.spd &&
           p1.sp.spe === p2.sp.spe &&
           [...p1.moves].sort().join(',') === [...p2.moves].sort().join(',');
  };

  // Filter out duplicates
  const uniqueNewPresets = presets.filter(newP => {
    const isDuplicate = existingPresets.some(oldP => arePresetsEqual(newP, oldP));
    if (isDuplicate) {
      console.log(`Skipping duplicate preset: ${newP.name}`);
    }
    return !isDuplicate;
  });

  if (uniqueNewPresets.length === 0) {
    console.log("No new unique presets to add.");
    process.exit(0);
  }

  const newPresetsText = uniqueNewPresets.map(p => JSON.stringify(p, null, 2).replace(/"([^"]+)":/g, '$1:')).join(',\n');
  const separator = currentListText.trim().length > 0 ? ',\n  ' : '';
  const replacement = `export const POKEMON_PRESETS: PokemonPreset[] = [${currentListText.replace(/\s+$/, '')}${separator}${newPresetsText.split('\n').join('\n  ')}\n];`;
  
  const updatedContent = fileContent.replace(exportRegex, replacement);
  fs.writeFileSync(PRESETS_FILE, updatedContent);
  console.log(`Successfully added ${uniqueNewPresets.length} unique preset(s):\n - ${uniqueNewPresets.map(p => p.name).join('\n - ')}`);
} else {
  console.error("Error: Could not find POKEMON_PRESETS array in the file.");
  process.exit(1);
}
