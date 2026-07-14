import { describe, it, expect } from 'vitest';
import { natureForStatWheel, getNatureStats, getNatureFromStats } from './pokemon-natures';

// The landscape Nature wheel controls the attacker's offensive stat (atk/spa) or the
// defender's defensive stat (def/spd). Regression: a lone boost (boostedStat with no
// hinderedStat) resolves to a neutral nature, so @smogon/calc applies no boost and the
// wheel silently does nothing to the damage.

describe('natureForStatWheel', () => {
  it('the lone-boost bug: an unpaired boost is neutral Hardy', () => {
    // What the broken wheel effectively produced.
    expect(getNatureFromStats('spa', null)).toBe('Hardy');
  });

  it('boost (target 2) is a real nature that actually boosts the tuned stat', () => {
    for (const stat of ['atk', 'spa', 'def', 'spd']) {
      const nature = natureForStatWheel(stat, 2);
      expect(nature).not.toBe('Hardy');                       // a real, applied nature
      expect(getNatureStats(nature).boostedStat).toBe(stat);  // and it boosts the right stat
    }
  });

  it('hinder (target 0) is a real nature that hinders the tuned stat', () => {
    for (const stat of ['atk', 'spa', 'def', 'spd']) {
      const nature = natureForStatWheel(stat, 0);
      expect(nature).not.toBe('Hardy');
      expect(getNatureStats(nature).hinderedStat).toBe(stat);
    }
  });

  it('neutral (target 1) is Hardy', () => {
    expect(natureForStatWheel('spa', 1)).toBe('Hardy');
  });

  it('pairs offensive stats with the conventional dump stat (Modest / Adamant)', () => {
    expect(natureForStatWheel('spa', 2)).toMatch(/^Modest/);  // +SpA -Atk
    expect(natureForStatWheel('atk', 2)).toMatch(/^Adamant/); // +Atk -SpA
    expect(natureForStatWheel('def', 2)).toMatch(/^Bold/);    // +Def -Atk
    expect(natureForStatWheel('spd', 2)).toMatch(/^Calm/);    // +SpD -Atk
  });
});
