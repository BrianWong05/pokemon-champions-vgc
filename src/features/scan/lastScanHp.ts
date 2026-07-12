// Scanned in-battle HP memory, keyed by species id. Written by each battle
// scan, applied when a defender is picked from the strip/roster chips,
// cleared together with the battle roster.
const KEY = 'scan.lastScanHp';

export function readLastScanHp(): Record<number, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const id = Number(k);
      if (Number.isFinite(id) && typeof v === 'number' && v >= 0 && v <= 100) out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveScanHp(entries: Array<{ id: number; hpPercent: number | null | undefined }>): void {
  const merged = readLastScanHp();
  for (const e of entries) {
    if (e.hpPercent != null && e.hpPercent >= 0 && e.hpPercent <= 100) merged[e.id] = e.hpPercent;
  }
  try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch { /* storage unavailable */ }
}

export function clearLastScanHp(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
