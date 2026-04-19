/**
 * Pokémon Champions Stat and Damage Formulas (Level 50 VGC)
 */

export const calculateHP = (base: number, sp: number): number => {
  return base + 75 + sp;
};

export const calculateStat = (base: number, sp: number, nature: number): number => {
  return Math.floor((base + 20 + sp) * nature);
};

export interface DamageResult {
  minDamage: number;
  maxDamage: number;
  minPercent: number;
  maxPercent: number;
}

export const calculateDamage = (
  attackerStat: number,
  defenderStat: number,
  movePower: number,
  modifiers: number,
  maxHP: number
): DamageResult => {
  // BaseDamage = Math.floor(Math.floor((22 * MovePower * Attack / Defense) / 50) + 2)
  const baseDamage = Math.floor(Math.floor((22 * movePower * attackerStat / defenderStat) / 50) + 2);
  
  const minDamage = Math.floor(baseDamage * modifiers * 0.85);
  const maxDamage = Math.floor(baseDamage * modifiers * 1.00);

  return {
    minDamage,
    maxDamage,
    minPercent: Number(((minDamage / maxHP) * 100).toFixed(1)),
    maxPercent: Number(((maxDamage / maxHP) * 100).toFixed(1)),
  };
};
