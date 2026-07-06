import fs from 'node:fs';
import Database from 'better-sqlite3';
import { createCanvas } from 'canvas';
import * as ort from 'onnxruntime-web';
import { parseReferenceMap } from '../src/features/scan/referenceData';
import { makeTextRenderer } from '../src/features/scan/textMatch';
import { computeDescriptor } from '../src/features/scan/fingerprint';
import { matchTile } from '../src/features/scan/match';
import { cropImage } from '../src/features/scan/segmentation';
import { resizeBilinearRgb, softmax, topCandidates, type Classifier } from '../src/features/scan/classifier';
import { buildPlayerScanVocab, type PlayerScanVocab } from '../src/db/repositories/scan.repo';
import type { PlayerScanDeps } from '../src/features/scan/scanPlayerFrame';

const INPUT_SIZE = 224; // must match classifier.ts's INPUT_SIZE (not exported)

// Node-side mirror of classifier.ts's loadClassifier: same classify() logic
// (resize -> tensor -> session.run -> softmax -> topCandidates), but reads
// model/classes off disk with fs instead of fetch. onnxruntime-web's `node`
// export condition resolves to its native ORT-node binding (dist/ort.node.min.js)
// under plain `require`/vitest, so no wasmPaths wiring is needed here.
let cachedClassifier: Promise<Classifier | null> | null = null;

async function loadNodeClassifierUncached(): Promise<Classifier | null> {
  const classes: number[] = JSON.parse(
    fs.readFileSync('public/models/pokemon-sprite-net/classes.json', 'utf8'),
  );
  ort.env.wasm.numThreads = 1;
  const modelBuf = fs.readFileSync('public/models/pokemon-sprite-net/model.onnx');
  const session = await ort.InferenceSession.create(new Uint8Array(modelBuf));

  return {
    classes,
    async classify(img, legalIds, topN = 3) {
      const chw = resizeBilinearRgb(img, INPUT_SIZE);
      const tensor = new ort.Tensor('float32', chw, [1, 3, INPUT_SIZE, INPUT_SIZE]);
      const outputs = await session.run({ input: tensor });
      const logits = outputs.logits.data as Float32Array;
      const probs = softmax(logits);
      return topCandidates(probs, classes, legalIds, topN);
    },
  };
}

export function loadNodeClassifier(): Promise<Classifier | null> {
  if (!cachedClassifier) {
    cachedClassifier = loadNodeClassifierUncached().catch((err) => {
      console.warn('[player-scan-core] node classifier unavailable, using descriptors', err);
      cachedClassifier = null;
      return null;
    });
  }
  return cachedClassifier;
}

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
  loadClassifier: loadNodeClassifier,
  matchTile: (img, refs, topN) => matchTile(computeDescriptor(img), refs, topN),
  cropImage,
  render: nodeRender,
};
