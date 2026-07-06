import fs from 'node:fs';
import Database from 'better-sqlite3';
import { createCanvas } from 'canvas';
import { parseReferenceMap } from '../src/features/scan/referenceData';
import { makeTextRenderer } from '../src/features/scan/textMatch';
import { computeDescriptor } from '../src/features/scan/fingerprint';
import { matchTile } from '../src/features/scan/match';
import { cropImage } from '../src/features/scan/segmentation';
import { buildPlayerScanVocab, type PlayerScanVocab } from '../src/db/repositories/scan.repo';
import type { PlayerScanDeps } from '../src/features/scan/scanPlayerFrame';

export const nodeRender = makeTextRenderer((w, h) => createCanvas(w, h));

export function loadNodeRefs() {
  const map = JSON.parse(fs.readFileSync('public/images/pokemon/player-panel-descriptors.json', 'utf8'));
  return parseReferenceMap(map);
}

export function buildVocabNode(): PlayerScanVocab {
  const db = new Database('vgc_pokemon.db', { readonly: true });
  const q = <T>(sql: string): T[] => db.prepare(sql).all() as T[];
  return buildPlayerScanVocab({
    moves: q("SELECT id, name_en AS nameEn, name_ja AS nameJa, name_zh AS nameZh, name_zh_hans AS nameZhHans FROM moves"),
    learnset: q("SELECT pokemon_id AS pokemonId, move_id AS moveId FROM pokemon_moves"),
    abilities: q(`SELECT pa.pokemon_id AS pokemonId, a.name_en AS nameEn, a.name_ja AS nameJa,
                         a.name_zh AS nameZh, a.name_zh_hans AS nameZhHans
                  FROM pokemon_abilities pa JOIN abilities a ON a.id = pa.ability_id`),
    items: q("SELECT name_en AS nameEn, name_ja AS nameJa, name_zh AS nameZh, name_zh_hans AS nameZhHans FROM items WHERE name_en IS NOT NULL"),
  });
}

export const nodeScanDeps: PlayerScanDeps = {
  loadRefs: async () => loadNodeRefs(),
  loadClassifier: async () => null,   // node: descriptor-only species matching
  matchTile: (img, refs, topN) => matchTile(computeDescriptor(img), refs, topN),
  cropImage,
  render: nodeRender,
};
