/**
 * Canonical Pokémon Champions stat formulas (Level 50, IV 31).
 * These are CLEAN stats: base + SP + nature only — no stat-stage or ability
 * multipliers. @smogon/calc applies boosts/abilities/items itself during the
 * damage calc, reading rawStats, so pre-applying them here would double-count.
 */

/** HP at Lv50/IV31: base + 75, +1 per SP. */
export const championsHP = (base: number, sp: number): number => {
  return base + 75 + sp
}

/**
 * Non-HP stat at Lv50/IV31: (base + 20 + sp) * natureMultiplier, floored.
 * natureMultiplier is 1.1 (boosted), 0.9 (hindered), or 1.0 (neutral).
 */
export const championsStat = (base: number, sp: number, natureMultiplier: number): number => {
  return Math.floor((base + 20 + sp) * natureMultiplier)
}
