import { useCallback, useState } from 'react';
import { clearBattleRoster, readBattleRoster, saveBattleRoster } from './battleRoster';

export function useBattleRoster() {
  const [roster, setRoster] = useState<number[] | null>(() => readBattleRoster());
  const confirmRoster = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    saveBattleRoster(ids);
    setRoster(ids);
  }, []);
  const clearRoster = useCallback(() => {
    clearBattleRoster();
    setRoster(null);
  }, []);
  return { roster, confirmRoster, clearRoster };
}
