// Full move table for the overlay's my-team scan (PlayerScanPanel needs
// MoveData for learnset display + buildConfigs). Mirrors usePokemonList;
// ponytail: extract a shared fetch hook if a third consumer appears.
import { useEffect, useState } from 'react';
import { getDb } from '@/db';
import { moves } from '@/db/schema';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';

export function useMoveList(): MoveData[] {
  const [list, setList] = useState<MoveData[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await getDb();
        const rows = await db.select().from(moves);
        if (!cancelled) setList(rows as MoveData[]);
      } catch (e) {
        console.error('[overlay] move list load failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return list;
}
