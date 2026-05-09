import { useCallback } from 'react';
import { getNatureStats, getNatureFromStats } from '@/features/pokemon/utils/pokemon-natures';

export interface StatState {
  boostedStat: string | null;
  hinderedStat: string | null;
  nature: string;
}

export const useStatEngine = () => {
  const calculateNatureToggle = (
    currentBoosted: string | null,
    currentHindered: string | null,
    stat: string,
    mod: '+' | '-'
  ): StatState => {
    let newBoosted = currentBoosted;
    let newHindered = currentHindered;

    if (mod === '+') {
      if (newBoosted === stat) {
        newBoosted = null;
      } else {
        newBoosted = stat;
        if (newHindered === stat) newHindered = null;
      }
    } else {
      if (newHindered === stat) {
        newHindered = null;
      } else {
        newHindered = stat;
        if (newBoosted === stat) newBoosted = null;
      }
    }

    const newNature = getNatureFromStats(newBoosted, newHindered);
    return { boostedStat: newBoosted, hinderedStat: newHindered, nature: newNature };
  };

  const getStatsForNature = (natureName: string): StatState => {
    const stats = getNatureStats(natureName);
    return {
      boostedStat: stats.boostedStat,
      hinderedStat: stats.hinderedStat,
      nature: natureName
    };
  };

  return {
    calculateNatureToggle,
    getStatsForNature
  };
};
