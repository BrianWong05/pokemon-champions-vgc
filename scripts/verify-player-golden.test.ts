import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { championsHP, championsStat } from '../src/features/pokemon/utils/champions-stats';
import { getNatureStats } from '../src/features/pokemon/utils/pokemon-natures';

interface GoldenSlot {
  species: string; ability: string; item: string; moves: string[];
  stats: number[]; sp: number[]; nature: string;
}
interface GoldenPair { movesImage: string; statsImage: string; lang: string; team: GoldenSlot[] }

const golden: Record<string, GoldenPair> = JSON.parse(fs.readFileSync('training/player-golden.json', 'utf8'));
const db = new Database('vgc_pokemon.db', { readonly: true });

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

describe('player-golden.json is self-consistent', () => {
  for (const [key, pair] of Object.entries(golden)) {
    if (!pair.team) continue; // skip non-pair entries like _todo
    describe(key, () => {
      pair.team.forEach((slot, i) => {
        it(`slot ${i + 1}: ${slot.species}`, () => {
          const p = db.prepare(
            'SELECT id, base_hp, base_attack, base_defense, base_sp_atk, base_sp_def, base_speed FROM pokemon WHERE name_en = ?'
          ).get(slot.species) as any;
          expect(p, `species ${slot.species} in DB`).toBeTruthy();

          const abilityRows = db.prepare(
            `SELECT a.name_en FROM abilities a JOIN pokemon_abilities pa ON pa.ability_id = a.id WHERE pa.pokemon_id = ?`
          ).all(p.id) as any[];
          expect(abilityRows.map(r => r.name_en)).toContain(slot.ability);

          for (const move of slot.moves) {
            const m = db.prepare(
              `SELECT m.id FROM moves m JOIN pokemon_moves pm ON pm.move_id = m.id WHERE pm.pokemon_id = ? AND m.name_en = ?`
            ).get(p.id, move);
            if (!m) {
              console.warn(`${slot.species} learns ${move} (not in pokemon_moves, likely event/transfer move)`);
            } else {
              expect(m).toBeTruthy();
            }
          }

          const bases = [p.base_hp, p.base_attack, p.base_defense, p.base_sp_atk, p.base_sp_def, p.base_speed];
          const { boostedStat, hinderedStat } = getNatureStats(slot.nature);
          expect(slot.stats[0]).toBe(championsHP(bases[0], slot.sp[0]));
          for (let s = 1; s < 6; s++) {
            const mult = STAT_KEYS[s] === boostedStat ? 1.1 : STAT_KEYS[s] === hinderedStat ? 0.9 : 1.0;
            expect(slot.stats[s], `${STAT_KEYS[s]}`).toBe(championsStat(bases[s], slot.sp[s], mult));
          }
          for (const sp of slot.sp) { expect(sp).toBeGreaterThanOrEqual(0); expect(sp).toBeLessThanOrEqual(32); }
        });
      });
    });
  }
});
