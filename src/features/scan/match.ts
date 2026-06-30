// src/features/scan/match.ts
import { hamming, cosine } from './fingerprint';
import type { Candidate, Descriptor, ReferenceEntry } from './types';

export interface ScoreWeights { dhash: number; rgb: number; sil: number; edge: number }
const DEFAULT_WEIGHTS: ScoreWeights = { dhash: 0.4, rgb: 0.3, sil: 0.15, edge: 0.15 };

export function scoreDescriptors(a: Descriptor, b: Descriptor, w: ScoreWeights = DEFAULT_WEIGHTS): number {
  const dh = 1 - hamming(a.dhash, b.dhash) / 64;
  return w.dhash * dh + w.rgb * cosine(a.rgb16, b.rgb16) + w.sil * cosine(a.sil8, b.sil8) + w.edge * cosine(a.edge8, b.edge8);
}

// Hue-invariant score (drops the color channel) for shiny / palette-swap tie-breaks.
function invariantScore(a: Descriptor, b: Descriptor): number {
  return 0.6 * (1 - hamming(a.dhash, b.dhash) / 64) + 0.2 * cosine(a.sil8, b.sil8) + 0.2 * cosine(a.edge8, b.edge8);
}

// Walks score-sorted entries and keeps the first occurrence of each id (i.e. the
// best-scoring one, since the input is sorted) until topN unique ids are collected.
// Reference sets may hold multiple descriptors per id (normal/shiny/extra crops);
// this collapses them to a single best candidate per id.
function topUniqueIds<T extends { id: number; score: number }>(sortedEntries: T[], topN: number): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const entry of sortedEntries) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
    if (out.length >= topN) break;
  }
  return out;
}

export function matchTile(desc: Descriptor, refs: ReferenceEntry[], topN = 3): Candidate[] {
  const scored = refs.map((r) => ({ id: r.id, score: scoreDescriptors(desc, r.desc), desc: r.desc }));
  scored.sort((a, b) => b.score - a.score);
  // Thin margin => re-rank the head on hue-invariant channels (shiny robustness).
  if (scored.length >= 2 && scored[0].score - scored[1].score < 0.05) {
    const head = scored.slice(0, Math.min(12, scored.length))
      .map((c) => ({ id: c.id, score: invariantScore(desc, c.desc) }))
      .sort((a, b) => b.score - a.score);
    return topUniqueIds(head, topN).map(({ id, score }) => ({ id, score }));
  }
  return topUniqueIds(scored, topN).map(({ id, score }) => ({ id, score }));
}
