// src/features/scan/referenceData.ts
import type { Descriptor, ReferenceEntry } from './types';

export function parseReferenceMap(map: Record<string, Descriptor | Descriptor[]>): ReferenceEntry[] {
  return Object.entries(map).flatMap(([id, descOrList]) => {
    const list = Array.isArray(descOrList) ? descOrList : [descOrList];
    return list.map((desc) => ({ id: Number(id), desc }));
  });
}

export async function loadReferenceDescriptors(baseUrl: string = import.meta.env.BASE_URL): Promise<ReferenceEntry[]> {
  const res = await fetch(`${baseUrl}images/pokemon/reference-descriptors.json`);
  if (!res.ok) {
    throw new Error(`reference-descriptors.json not found (HTTP ${res.status}). Generate it: npx tsx scripts/generate-sprite-descriptors.ts`);
  }
  // In dev, a missing file is served as index.html (HTTP 200), so guard the parse
  // and give an actionable message instead of a cryptic JSON syntax error.
  const text = await res.text();
  let map: Record<string, Descriptor | Descriptor[]>;
  try {
    map = JSON.parse(text);
  } catch {
    throw new Error('reference-descriptors.json is missing or not valid JSON. Generate it: npx tsx scripts/generate-sprite-descriptors.ts');
  }
  return parseReferenceMap(map);
}

export function filterByFormatLegal(refs: ReferenceEntry[], legalIds: Set<number>): ReferenceEntry[] {
  return refs.filter((r) => legalIds.has(r.id));
}
