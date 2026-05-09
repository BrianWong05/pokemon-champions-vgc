/**
 * Calculates the SP (Special Points) for a given EV (Effort Value).
 * Formula: SP = floor((EV + 4) / 8)
 * Max EVs per stat is 252, resulting in 32 SP.
 */
export const calculateSP = (ev: number): number => {
  return Math.floor((ev + 4) / 8);
};
