// src/features/scan/referenceData.ts
import type { Descriptor, ReferenceEntry } from './types';

export function parseReferenceMap(map: Record<string, Descriptor>): ReferenceEntry[] {
  return Object.entries(map).map(([id, desc]) => ({ id: Number(id), desc }));
}

export async function loadReferenceDescriptors(baseUrl: string = import.meta.env.BASE_URL): Promise<ReferenceEntry[]> {
  const res = await fetch(`${baseUrl}images/pokemon/reference-descriptors.json`);
  if (!res.ok) throw new Error(`Failed to load reference descriptors: ${res.status}`);
  return parseReferenceMap(await res.json());
}

export function filterByFormatLegal(refs: ReferenceEntry[], legalIds: Set<number>): ReferenceEntry[] {
  return refs.filter((r) => legalIds.has(r.id));
}
